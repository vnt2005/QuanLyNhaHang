using Microsoft.EntityFrameworkCore;
using QuanLyNhaHang.Application.Common.Orders;
using QuanLyNhaHang.Domain.Entities;
using QuanLyNhaHang.Infrastructure.Persistence;
using Xunit;

namespace QuanLyNhaHang.UnitTests.Application;

public sealed class CustomerOrderCancellationAbuseGuardTests
{
    [Fact]
    public async Task NoCustomerCancellation_AllowsOrderCreation()
    {
        await using var context = CreateContext();
        var customerUserId = Guid.NewGuid();

        await CustomerOrderCancellationAbuseGuard.EnsureCanCreateOrderAsync(
            context,
            customerUserId,
            CancellationToken.None);
    }

    [Theory]
    [InlineData(1)]
    [InlineData(2)]
    [InlineData(3)]
    [InlineData(4)]
    public async Task FewerThanFiveCustomerCancellations_AllowsOrderCreation(
        int cancellationCount)
    {
        await using var context = CreateContext();
        var customerUserId = Guid.NewGuid();
        AddCustomerCancellationNotifications(
            context,
            customerUserId,
            cancellationCount);
        await context.SaveChangesAsync();

        await CustomerOrderCancellationAbuseGuard.EnsureCanCreateOrderAsync(
            context,
            customerUserId,
            CancellationToken.None);
    }

    [Theory]
    [InlineData(5)]
    [InlineData(8)]
    public async Task FiveOrMoreRecentCustomerCancellations_BlocksForThirtyMinutes(
        int cancellationCount)
    {
        await using var context = CreateContext();
        var customerUserId = Guid.NewGuid();
        AddCustomerCancellationNotifications(
            context,
            customerUserId,
            cancellationCount);
        await context.SaveChangesAsync();

        var exception = await Assert.ThrowsAsync<InvalidOperationException>(() =>
            CustomerOrderCancellationAbuseGuard.EnsureCanCreateOrderAsync(
                context,
                customerUserId,
                CancellationToken.None));

        Assert.Contains("đã tự hủy 5 đơn", exception.Message);
        Assert.Contains("30 phút", exception.Message);
        Assert.DoesNotContain("ngày", exception.Message);
    }

    [Fact]
    public async Task AdminCancellationNotification_DoesNotTriggerCustomerCooldown()
    {
        await using var context = CreateContext();
        var customerUserId = Guid.NewGuid();

        for (var index = 0; index < 8; index++)
        {
            context.Notifications.Add(new Notification(
                customerUserId,
                "Order.Cancelled",
                "Đơn đã bị hủy",
                $"Nhà hàng đã hủy đơn test {index + 1}.",
                "warning",
                "/orders",
                Guid.NewGuid()));
        }
        await context.SaveChangesAsync();

        await CustomerOrderCancellationAbuseGuard.EnsureCanCreateOrderAsync(
            context,
            customerUserId,
            CancellationToken.None);
    }

    private static void AddCustomerCancellationNotifications(
        ApplicationDbContext context,
        Guid customerUserId,
        int cancellationCount)
    {
        for (var index = 0; index < cancellationCount; index++)
        {
            context.Notifications.Add(new Notification(
                customerUserId,
                "Order.CancelledByCustomer",
                "Đã hủy đơn hàng",
                $"Đơn test {index + 1} đã được khách hủy.",
                "warning",
                "/orders",
                Guid.NewGuid()));
        }
    }

    private static ApplicationDbContext CreateContext()
    {
        var options = new DbContextOptionsBuilder<ApplicationDbContext>()
            .UseInMemoryDatabase($"customer-cancel-abuse-{Guid.NewGuid():N}")
            .Options;

        return new ApplicationDbContext(options);
    }
}
