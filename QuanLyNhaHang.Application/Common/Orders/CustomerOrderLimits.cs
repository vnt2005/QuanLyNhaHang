namespace QuanLyNhaHang.Application.Common.Orders;

public static class CustomerOrderLimits
{
    public const int MaxOrderLines = 20;
    public const int MaxQuantityPerMenuItem = 5;
    public const int MaxTotalQuantity = 50;

    public static readonly TimeSpan TakeawayDuplicateWindow =
        TimeSpan.FromMinutes(30);

    public static readonly TimeSpan DineInBurstWindow =
        TimeSpan.FromMinutes(2);

    public const int MaxDineInOrdersPerBurstWindow = 3;

    // Chống hành vi đặt -> tự hủy -> đặt lại liên tục trên CustomerWeb.
    // Chỉ các lần hủy do chính khách thực hiện mới được tính vào các ngưỡng này.
    public static readonly TimeSpan CancellationAbuseHistoryWindow =
        TimeSpan.FromDays(7);

    public static readonly TimeSpan FirstCancellationWindow =
        TimeSpan.FromMinutes(5);

    public static readonly TimeSpan FirstCancellationCooldown =
        TimeSpan.FromMinutes(5);

    public const int RepeatedCancellationThreshold = 2;
    public static readonly TimeSpan RepeatedCancellationWindow =
        TimeSpan.FromMinutes(30);
    public static readonly TimeSpan RepeatedCancellationCooldown =
        TimeSpan.FromMinutes(30);

    public const int FrequentCancellationThreshold = 3;
    public static readonly TimeSpan FrequentCancellationWindow =
        TimeSpan.FromHours(6);
    public static readonly TimeSpan FrequentCancellationCooldown =
        TimeSpan.FromHours(6);

    public const int DailyCancellationThreshold = 5;
    public static readonly TimeSpan DailyCancellationWindow =
        TimeSpan.FromHours(24);
    public static readonly TimeSpan DailyCancellationCooldown =
        TimeSpan.FromHours(24);

    public const int SevereCancellationThreshold = 8;
    public static readonly TimeSpan SevereCancellationWindow =
        TimeSpan.FromDays(7);
    public static readonly TimeSpan SevereCancellationCooldown =
        TimeSpan.FromDays(7);
}
