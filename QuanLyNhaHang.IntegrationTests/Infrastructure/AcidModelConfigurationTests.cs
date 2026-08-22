using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata;
using Microsoft.Extensions.DependencyInjection;
using QuanLyNhaHang.Domain.Entities;
using QuanLyNhaHang.Infrastructure.Persistence;
using Xunit;

namespace QuanLyNhaHang.IntegrationTests.Infrastructure;

public sealed class AcidModelConfigurationTests
{
    [Fact]
    public void CriticalAggregates_HaveOptimisticConcurrencyTokens()
    {
        using var factory = new ApiWebApplicationFactory();
        using var scope = factory.Services.CreateScope();
        var context = scope.ServiceProvider
            .GetRequiredService<ApplicationDbContext>();

        var protectedEntities = new[]
        {
            typeof(Order),
            typeof(OrderItem),
            typeof(Payment),
            typeof(PaymentAttempt),
            typeof(Reservation),
            typeof(Invoice),
            typeof(RestaurantTable)
        };

        foreach (var entityType in protectedEntities)
        {
            var metadata = context.Model.FindEntityType(entityType);
            Assert.NotNull(metadata);

            var rowVersion = metadata.FindProperty("RowVersion");
            Assert.NotNull(rowVersion);
            Assert.True(rowVersion.IsConcurrencyToken);
            Assert.Equal(
                ValueGenerated.OnAddOrUpdate,
                rowVersion.ValueGenerated);
        }
    }

    [Fact]
    public void CriticalReferences_AreDatabaseForeignKeys_WithRestrictDelete()
    {
        using var factory = new ApiWebApplicationFactory();
        using var scope = factory.Services.CreateScope();
        var context = scope.ServiceProvider
            .GetRequiredService<ApplicationDbContext>();

        AssertRestrictForeignKey<Payment, Order>(context, "OrderId");
        AssertRestrictForeignKey<OrderItem, Order>(context, "OrderId");
        AssertRestrictForeignKey<OrderItem, MenuItem>(context, "MenuItemId");
        AssertRestrictForeignKey<Reservation, RestaurantTable>(
            context,
            "RestaurantTableId");
        AssertRestrictForeignKey<Invoice, Payment>(context, "PaymentId");
        AssertRestrictForeignKey<Invoice, Order>(context, "OrderId");
        AssertRestrictForeignKey<InvoiceItem, Invoice>(context, "InvoiceId");
    }

    [Fact]
    public void IdempotencyAndOpenPaymentAttempts_HaveUniqueIndexes()
    {
        using var factory = new ApiWebApplicationFactory();
        using var scope = factory.Services.CreateScope();
        var context = scope.ServiceProvider
            .GetRequiredService<ApplicationDbContext>();

        var idempotency = context.Model.FindEntityType(
            typeof(IdempotencyRecord));
        Assert.NotNull(idempotency);
        Assert.Contains(
            idempotency.GetIndexes(),
            index => index.IsUnique &&
                     IndexMatches(index, "Scope", "Actor", "Key"));

        var attempts = context.Model.FindEntityType(typeof(PaymentAttempt));
        Assert.NotNull(attempts);
        Assert.Contains(
            attempts.GetIndexes(),
            index => index.IsUnique &&
                     IndexMatches(index, "OrderId", "Provider"));
    }

    private static void AssertRestrictForeignKey<TEntity, TPrincipal>(
        ApplicationDbContext context,
        string propertyName)
    {
        var entityType = context.Model.FindEntityType(typeof(TEntity));
        Assert.NotNull(entityType);

        var foreignKey = Assert.Single(
            entityType.GetForeignKeys().Where(candidate =>
                candidate.PrincipalEntityType.ClrType == typeof(TPrincipal) &&
                candidate.Properties.Count == 1 &&
                candidate.Properties[0].Name == propertyName));

        Assert.Equal(DeleteBehavior.Restrict, foreignKey.DeleteBehavior);
    }

    private static bool IndexMatches(
        IReadOnlyIndex index,
        params string[] propertyNames)
    {
        return index.Properties
            .Select(property => property.Name)
            .SequenceEqual(propertyNames);
    }
}
