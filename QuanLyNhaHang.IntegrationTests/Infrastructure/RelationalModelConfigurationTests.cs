using Microsoft.EntityFrameworkCore.Metadata;
using Microsoft.Extensions.DependencyInjection;
using QuanLyNhaHang.Domain.Entities;
using QuanLyNhaHang.Infrastructure.Persistence;
using Xunit;

namespace QuanLyNhaHang.IntegrationTests.Infrastructure;

public sealed class RelationalModelConfigurationTests
{
    [Fact]
    public void InvoicePaymentIdUniqueIndex_ExcludesCancelledInvoices()
    {
        using var factory = new ApiWebApplicationFactory();
        using var scope = factory.Services.CreateScope();
        var context = scope.ServiceProvider
            .GetRequiredService<ApplicationDbContext>();

        var invoiceType = context.Model.FindEntityType(typeof(Invoice));
        Assert.NotNull(invoiceType);

        var paymentIdIndex = Assert.Single(
            invoiceType!.GetIndexes(),
            index =>
                index.Properties.Count == 1 &&
                index.Properties[0].Name == nameof(Invoice.PaymentId));

        Assert.True(paymentIdIndex.IsUnique);
        Assert.Equal(
            "[Status] <> 'Cancelled'",
            paymentIdIndex.FindAnnotation(RelationalAnnotationNames.Filter)?.Value);
    }
}
