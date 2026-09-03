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
    [InlineData(1, "5 phút")]
    [InlineData(2, "30 phút")]
    [InlineData(3, "6 giờ")]
    [InlineData(5, "24 giờ")]
    [InlineData(8, "7 ngày")]
    public async Task RepeatedCustomerCancellation_EscalatesCooldown(
        int cancellationCount,
        string expectedRemaining)
    {
        await using var context = CreateContext();
        var customerUserId = Guid.NewGuid();

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

        await context.SaveChangesAsync();

        var exception = await Assert.ThrowsAsync<InvalidOperationException>(() =>
            CustomerOrderCancellationAbuseGuard.EnsureCanCreateOrderAsync(
                context,
                customerUserId,
                CancellationToken.None));

        Assert.Contains("hủy đơn liên tục", exception.Message);
        Assert.Contains(expectedRemaining, exception.Message);
    }

    [Fact]
    public async Task AdminCancellationNotification_DoesNotTriggerCustomerCooldown()
    {
        await using var context = CreateContext();
        var customerUserId = Guid.NewGuid();

        context.Notifications.Add(new Notification(
            customerUserId,
            "Order.Cancelled",
            "Đơn đã bị hủy",
            "Nhà hàng đã hủy đơn test.",
            "warning",
            "/orders",
            Guid.NewGuid()));
        await context.SaveChangesAsync();

        await CustomerOrderCancellationAbuseGuard.EnsureCanCreateOrderAsync(
            context,
            customerUserId,
            CancellationToken.None);
    }

    private static ApplicationDbContext CreateContext()
    {
        var options = new DbContextOptionsBuilder<ApplicationDbContext>()
            .UseInMemoryDatabase($"customer-cancel-abuse-{Guid.NewGuid():N}")
            .Options;

        return new ApplicationDbContext(options);
    }
}
