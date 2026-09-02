using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using QuanLyNhaHang.Application.Common.Payments;
using QuanLyNhaHang.Application.Features.AiAssistant;
using QuanLyNhaHang.Application.Features.AiAssistant.DTOs;
using QuanLyNhaHang.Domain.Entities;
using QuanLyNhaHang.Infrastructure.AI;
using QuanLyNhaHang.Infrastructure.Persistence;
using Xunit;

namespace QuanLyNhaHang.UnitTests.Application;

public sealed class AiAssistantFullDatasetTests
{
    [Fact]
    public async Task CustomerOrders_UsesWholeAccountHistoryInsteadOfTenRecentOrders()
    {
        await using var context = CreateContext();
        var customerId = Guid.NewGuid();

        for (var index = 0; index < 44; index++)
        {
            var order = Order.CreateTakeaway(
                $"ORD-AI-{index:D3}",
                "Khách test",
                "0900000000",
                null,
                null);
            order.AssignCustomer(customerId);

            if (index < 10)
                order.Cancel();
            else if (index < 24)
                order.MarkCompleted();
            else
                order.MarkReady();

            context.Orders.Add(order);

            if (index >= 10 && index < 24)
            {
                context.Payments.Add(new Payment(
                    order.Id,
                    10_000m,
                    0m,
                    0m,
                    10_000m,
                    "Cash",
                    null));
            }
        }

        await context.SaveChangesAsync();

        var provider = CreateProvider(context);
        var result = await provider.ExecuteCustomerToolAsync(
            AiAssistantToolNames.MyOrders,
            JsonSerializer.SerializeToElement(new { }),
            new AiAssistantCallerContext { UserId = customerId, Role = "Customer" },
            CancellationToken.None);
        var json = JsonSerializer.SerializeToElement(result);

        var summary = json.GetProperty("summary");
        Assert.Equal(44, summary.GetProperty("totalOrders").GetInt32());
        Assert.Equal(14, summary.GetProperty("paidOrders").GetInt32());
        Assert.Equal(30, summary.GetProperty("unpaidOrders").GetInt32());
        Assert.Equal(44, json.GetProperty("totalCount").GetInt32());
        Assert.Equal(44, json.GetProperty("returnedCount").GetInt32());
        Assert.False(json.GetProperty("hasMore").GetBoolean());
    }

    [Fact]
    public async Task CustomerOrders_FilterCountsAreCalculatedBeforeDetailLimit()
    {
        await using var context = CreateContext();
        var customerId = Guid.NewGuid();

        for (var index = 0; index < 120; index++)
        {
            var order = Order.CreateTakeaway(
                $"ORD-FILTER-{index:D3}",
                "Khách test",
                "0900000000",
                null,
                null);
            order.AssignCustomer(customerId);
            order.MarkCompleted();
            context.Orders.Add(order);

            if (index < 75)
            {
                context.Payments.Add(new Payment(
                    order.Id,
                    20_000m,
                    0m,
                    0m,
                    20_000m,
                    "Cash",
                    null));
            }
        }

        await context.SaveChangesAsync();

        var provider = CreateProvider(context);
        var result = await provider.ExecuteCustomerToolAsync(
            AiAssistantToolNames.MyOrders,
            JsonSerializer.SerializeToElement(new
            {
                status = "completed",
                paymentStatus = "paid",
                limit = 25
            }),
            new AiAssistantCallerContext { UserId = customerId, Role = "Customer" },
            CancellationToken.None);
        var json = JsonSerializer.SerializeToElement(result);

        Assert.Equal(75, json.GetProperty("totalCount").GetInt32());
        Assert.Equal(25, json.GetProperty("returnedCount").GetInt32());
        Assert.True(json.GetProperty("hasMore").GetBoolean());
        Assert.Equal(120, json.GetProperty("summary").GetProperty("totalOrders").GetInt32());
    }

    [Fact]
    public async Task CustomerNotifications_ReturnExactTotalBeyondReturnedWindow()
    {
        await using var context = CreateContext();
        var customerId = Guid.NewGuid();

        for (var index = 0; index < 75; index++)
        {
            context.Notifications.Add(new Notification(
                customerId,
                "Order",
                $"Thông báo {index}",
                "Nội dung",
                "Info",
                null,
                null));
        }

        await context.SaveChangesAsync();

        var provider = CreateProvider(context);
        var result = await provider.ExecuteCustomerToolAsync(
            AiAssistantToolNames.MyNotifications,
            JsonSerializer.SerializeToElement(new { limit = 20 }),
            new AiAssistantCallerContext { UserId = customerId, Role = "Customer" },
            CancellationToken.None);
        var json = JsonSerializer.SerializeToElement(result);

        Assert.Equal(75, json.GetProperty("totalCount").GetInt32());
        Assert.Equal(20, json.GetProperty("returnedCount").GetInt32());
        Assert.True(json.GetProperty("hasMore").GetBoolean());
    }

    private static ApplicationDbContext CreateContext()
    {
        var options = new DbContextOptionsBuilder<ApplicationDbContext>()
            .UseInMemoryDatabase($"ai-full-dataset-{Guid.NewGuid():N}")
            .Options;
        return new ApplicationDbContext(options);
    }

    private static AiAssistantDataProvider CreateProvider(ApplicationDbContext context)
        => new(
            context,
            new FakePaymentGateway(),
            new FakePaymentChannelReadiness());

    private sealed class FakePaymentGateway : IPaymentGateway
    {
        public string Provider => "Test";
        public bool IsConfigured => true;

        public PaymentInstruction CreatePaymentInstruction(long providerOrderCode, int amount)
            => throw new InvalidOperationException("Read-only AI test must not create payment instructions.");
    }

    private sealed class FakePaymentChannelReadiness : IPaymentChannelReadiness
    {
        public PaymentChannelReadinessSnapshot GetSnapshot()
            => new(false, true, DateTime.UtcNow, DateTime.UtcNow.AddMinutes(1));

        public PaymentChannelReadinessSnapshot ConfirmExternalHeartbeat()
            => throw new InvalidOperationException("Read-only AI test must not mutate readiness state.");
    }
}
