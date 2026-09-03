using Microsoft.EntityFrameworkCore;
using QuanLyNhaHang.Application.Common.Interfaces;

namespace QuanLyNhaHang.Application.Common.Orders;

public static class CustomerOrderCancellationAbuseGuard
{
    private const string CustomerCancelledNotificationType =
        "Order.CancelledByCustomer";

    public static async Task EnsureCanCreateOrderAsync(
        IApplicationDbContext context,
        Guid? customerUserId,
        CancellationToken cancellationToken)
    {
        if (!customerUserId.HasValue || customerUserId.Value == Guid.Empty)
            return;

        var utcNow = DateTime.UtcNow;
        var historyStart = utcNow.Subtract(
            CustomerOrderLimits.CancellationAbuseWindow);

        // Chỉ notification do chính khách tự hủy mới được tính. Đơn bị Admin
        // hoặc hệ thống hủy không làm tăng bộ đếm chống abuse của tài khoản.
        var cancellationRecords = await context.Notifications
            .AsNoTracking()
            .Where(notification =>
                notification.UserId == customerUserId.Value &&
                notification.Type == CustomerCancelledNotificationType &&
                notification.CreatedAt >= historyStart)
            .Select(notification => new
            {
                notification.EntityId,
                notification.CreatedAt
            })
            .ToListAsync(cancellationToken);

        var cancellationTimes = cancellationRecords
            .GroupBy(record => record.EntityId)
            .Select(group => group.Max(record => record.CreatedAt))
            .OrderByDescending(value => value)
            .ToArray();

        if (cancellationTimes.Length < CustomerOrderLimits.CancellationAbuseThreshold)
            return;

        var latestCancellation = cancellationTimes[0];
        var blockUntil = latestCancellation.Add(
            CustomerOrderLimits.CancellationAbuseCooldown);

        if (blockUntil <= utcNow)
            return;

        throw new InvalidOperationException(
            $"Tài khoản tạm thời bị hạn chế tạo đơn mới vì đã tự hủy " +
            $"{CustomerOrderLimits.CancellationAbuseThreshold} đơn trong " +
            $"{CustomerOrderLimits.CancellationAbuseWindow.TotalMinutes:0} phút gần đây. " +
            $"Vui lòng thử lại sau {FormatRemaining(blockUntil - utcNow)}.");
    }

    private static string FormatRemaining(TimeSpan remaining)
    {
        if (remaining >= TimeSpan.FromHours(1))
        {
            var hours = Math.Max(1, (int)Math.Ceiling(remaining.TotalHours));
            return $"khoảng {hours} giờ";
        }

        var minutes = Math.Max(1, (int)Math.Ceiling(remaining.TotalMinutes));
        return $"khoảng {minutes} phút";
    }
}
