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
            CustomerOrderLimits.CancellationAbuseHistoryWindow);

        // Dựa vào notification do chính luồng khách tự hủy tạo ra thay vì chỉ
        // nhìn Order.Status=Cancelled. Nhờ vậy đơn bị Admin/hệ thống hủy không
        // làm khách bị tính nhầm vào cơ chế chống spam.
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

        if (cancellationTimes.Length == 0)
            return;

        var blockUntil = ResolveBlockUntil(cancellationTimes, utcNow);
        if (!blockUntil.HasValue || blockUntil.Value <= utcNow)
            return;

        throw new InvalidOperationException(
            "Tài khoản tạm thời bị hạn chế tạo đơn mới do hủy đơn liên tục. " +
            $"Vui lòng thử lại sau {FormatRemaining(blockUntil.Value - utcNow)}.");
    }

    private static DateTime? ResolveBlockUntil(
        IReadOnlyCollection<DateTime> cancellationTimes,
        DateTime utcNow)
    {
        var severe = ResolveTier(
            cancellationTimes,
            utcNow,
            CustomerOrderLimits.SevereCancellationThreshold,
            CustomerOrderLimits.SevereCancellationWindow,
            CustomerOrderLimits.SevereCancellationCooldown);
        if (severe.HasValue)
            return severe;

        var daily = ResolveTier(
            cancellationTimes,
            utcNow,
            CustomerOrderLimits.DailyCancellationThreshold,
            CustomerOrderLimits.DailyCancellationWindow,
            CustomerOrderLimits.DailyCancellationCooldown);
        if (daily.HasValue)
            return daily;

        var frequent = ResolveTier(
            cancellationTimes,
            utcNow,
            CustomerOrderLimits.FrequentCancellationThreshold,
            CustomerOrderLimits.FrequentCancellationWindow,
            CustomerOrderLimits.FrequentCancellationCooldown);
        if (frequent.HasValue)
            return frequent;

        var repeated = ResolveTier(
            cancellationTimes,
            utcNow,
            CustomerOrderLimits.RepeatedCancellationThreshold,
            CustomerOrderLimits.RepeatedCancellationWindow,
            CustomerOrderLimits.RepeatedCancellationCooldown);
        if (repeated.HasValue)
            return repeated;

        return ResolveTier(
            cancellationTimes,
            utcNow,
            1,
            CustomerOrderLimits.FirstCancellationWindow,
            CustomerOrderLimits.FirstCancellationCooldown);
    }

    private static DateTime? ResolveTier(
        IReadOnlyCollection<DateTime> cancellationTimes,
        DateTime utcNow,
        int threshold,
        TimeSpan historyWindow,
        TimeSpan cooldown)
    {
        var windowStart = utcNow.Subtract(historyWindow);
        var matches = cancellationTimes
            .Where(value => value >= windowStart)
            .OrderByDescending(value => value)
            .ToArray();

        if (matches.Length < threshold)
            return null;

        var blockUntil = matches[0].Add(cooldown);
        return blockUntil > utcNow ? blockUntil : null;
    }

    private static string FormatRemaining(TimeSpan remaining)
    {
        if (remaining >= TimeSpan.FromDays(1))
        {
            var days = Math.Max(1, (int)Math.Ceiling(remaining.TotalDays));
            return $"khoảng {days} ngày";
        }

        if (remaining >= TimeSpan.FromHours(1))
        {
            var hours = Math.Max(1, (int)Math.Ceiling(remaining.TotalHours));
            return $"khoảng {hours} giờ";
        }

        var minutes = Math.Max(1, (int)Math.Ceiling(remaining.TotalMinutes));
        return $"khoảng {minutes} phút";
    }
}
