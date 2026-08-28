using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using QuanLyNhaHang.Application.Common.Constants;
using QuanLyNhaHang.Domain.Entities;
using QuanLyNhaHang.Infrastructure.Persistence;
using QuanLyNhaHang.Infrastructure.Services;
using QuanLyNhaHang.IntegrationTests.Infrastructure;
using Xunit;

namespace QuanLyNhaHang.IntegrationTests.Business;

public sealed class UnpaidTakeawayOrderExpiryTests
{
    [Fact]
    public async Task ReadyUnpaidTakeaway_IsCancelled_WithAttemptsAndNotifications()
    {
        using var factory = new ApiWebApplicationFactory();

        var adminId = await factory.SeedUserAsync(
            $"expiry-admin-{Guid.NewGuid():N}@example.com",
            "Password123!",
            role: SystemRoles.Admin);
        var customerId = await factory.SeedUserAsync(
            $"expiry-customer-{Guid.NewGuid():N}@example.com",
            "Password123!",
            role: SystemRoles.Customer);

        Guid orderId;
        Guid orderItemId;
        Guid paymentAttemptId;

        using (var seedScope = factory.Services.CreateScope())
        {
            var context = seedScope.ServiceProvider
                .GetRequiredService<ApplicationDbContext>();

            var category = new MenuCategory(
                $"Expiry category {Guid.NewGuid():N}",
                null,
                1);
            var menuItem = new MenuItem(
                category.Id,
                "Món chờ thanh toán",
                null,
                120_000m,
                null);
            var order = Order.CreateTakeaway(
                $"ORD-{Guid.NewGuid():N}",
                "Khách timeout",
                "0901000020",
                null,
                null);
            order.AssignCustomer(customerId);

            var orderItem = new OrderItem(
                order.Id,
                menuItem.Id,
                menuItem.Name,
                1,
                menuItem.Price,
                null);
            orderItem.MarkCooking();
            orderItem.MarkReady();
            order.MarkReady();
            order.UpdateTotalAmount(orderItem.TotalPrice);

            var paymentAttempt = new PaymentAttempt(
                order.Id,
                "SePay",
                Random.Shared.NextInt64(1, long.MaxValue),
                order.TotalAmount,
                DateTime.UtcNow.AddMinutes(15));

            context.MenuCategories.Add(category);
            context.MenuItems.Add(menuItem);
            context.Orders.Add(order);
            context.OrderItems.Add(orderItem);
            context.PaymentAttempts.Add(paymentAttempt);
            await context.SaveChangesAsync();

            orderId = order.Id;
            orderItemId = orderItem.Id;
            paymentAttemptId = paymentAttempt.Id;
        }

        using (var processorScope = factory.Services.CreateScope())
        {
            var processor = processorScope.ServiceProvider
                .GetRequiredService<UnpaidTakeawayOrderExpiryProcessor>();
            await processor.CancelExpiredAsync(gracePeriod: TimeSpan.Zero);
        }

        using var verificationScope = factory.Services.CreateScope();
        var verificationContext = verificationScope.ServiceProvider
            .GetRequiredService<ApplicationDbContext>();

        var orderAfterExpiry = await verificationContext.Orders
            .AsNoTracking()
            .SingleAsync(order => order.Id == orderId);
        var itemAfterExpiry = await verificationContext.OrderItems
            .AsNoTracking()
            .SingleAsync(item => item.Id == orderItemId);
        var attemptAfterExpiry = await verificationContext.PaymentAttempts
            .AsNoTracking()
            .SingleAsync(attempt => attempt.Id == paymentAttemptId);
        var notifications = await verificationContext.Notifications
            .AsNoTracking()
            .Where(notification =>
                notification.EntityId == orderId &&
                notification.Type == "Order.AutoCancelledPaymentTimeout")
            .ToListAsync();

        Assert.Equal("Cancelled", orderAfterExpiry.Status);
        Assert.Equal("Cancelled", itemAfterExpiry.Status);
        Assert.Equal(PaymentAttempt.CancelledStatus, attemptAfterExpiry.Status);
        Assert.Contains(notifications, notification => notification.UserId == customerId);
        Assert.Contains(notifications, notification => notification.UserId == adminId);
    }

    [Fact]
    public async Task ReadyPaidTakeaway_IsNeverCancelledByExpiryProcessor()
    {
        using var factory = new ApiWebApplicationFactory();

        Guid orderId;
        Guid orderItemId;

        using (var seedScope = factory.Services.CreateScope())
        {
            var context = seedScope.ServiceProvider
                .GetRequiredService<ApplicationDbContext>();
            await context.Database.EnsureCreatedAsync();

            var category = new MenuCategory(
                $"Paid expiry category {Guid.NewGuid():N}",
                null,
                1);
            var menuItem = new MenuItem(
                category.Id,
                "Món đã thanh toán",
                null,
                150_000m,
                null);
            var order = Order.CreateTakeaway(
                $"ORD-{Guid.NewGuid():N}",
                "Khách đã trả",
                "0901000021",
                null,
                null);
            var orderItem = new OrderItem(
                order.Id,
                menuItem.Id,
                menuItem.Name,
                1,
                menuItem.Price,
                null);
            orderItem.MarkCooking();
            orderItem.MarkReady();
            order.MarkReady();
            order.UpdateTotalAmount(orderItem.TotalPrice);

            var payment = new Payment(
                order.Id,
                order.TotalAmount,
                0m,
                0m,
                order.TotalAmount,
                "BankTransfer",
                "Giả lập thanh toán đã ghi nhận");

            context.MenuCategories.Add(category);
            context.MenuItems.Add(menuItem);
            context.Orders.Add(order);
            context.OrderItems.Add(orderItem);
            context.Payments.Add(payment);
            await context.SaveChangesAsync();

            orderId = order.Id;
            orderItemId = orderItem.Id;
        }

        using (var processorScope = factory.Services.CreateScope())
        {
            var processor = processorScope.ServiceProvider
                .GetRequiredService<UnpaidTakeawayOrderExpiryProcessor>();
            await processor.CancelExpiredAsync(gracePeriod: TimeSpan.Zero);
        }

        using var verificationScope = factory.Services.CreateScope();
        var verificationContext = verificationScope.ServiceProvider
            .GetRequiredService<ApplicationDbContext>();
        var orderAfterSweep = await verificationContext.Orders
            .AsNoTracking()
            .SingleAsync(order => order.Id == orderId);
        var itemAfterSweep = await verificationContext.OrderItems
            .AsNoTracking()
            .SingleAsync(item => item.Id == orderItemId);

        Assert.Equal("Ready", orderAfterSweep.Status);
        Assert.Equal("Ready", itemAfterSweep.Status);
    }
}
