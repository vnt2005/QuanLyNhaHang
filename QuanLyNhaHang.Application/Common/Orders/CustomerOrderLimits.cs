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

    // Khách đã đăng nhập chỉ bị khóa khi thực sự có chuỗi tự hủy lặp lại.
    // 1-4 lần hủy không khóa tạo đơn mới; lần thứ 5 trong cửa sổ theo dõi
    // mới kích hoạt cooldown 30 phút tính từ lần hủy gần nhất.
    public const int CancellationAbuseThreshold = 5;
    public static readonly TimeSpan CancellationAbuseWindow =
        TimeSpan.FromMinutes(30);
    public static readonly TimeSpan CancellationAbuseCooldown =
        TimeSpan.FromMinutes(30);

    // Guest không có tài khoản được theo dõi đồng thời theo client-id và IP.
    // Thiết bị đạt ngưỡng sẽ kéo theo IP hiện tại bị khóa cùng thời gian;
    // IP có ngưỡng cao hơn để hạn chế khóa nhầm nhiều người dùng chung NAT.
    public const int AnonymousDeviceOrderAttemptThreshold = 5;
    public const int AnonymousIpOrderAttemptThreshold = 12;
    public static readonly TimeSpan AnonymousOrderAttemptWindow =
        TimeSpan.FromMinutes(5);
    public static readonly TimeSpan AnonymousOrderBlockDuration =
        TimeSpan.FromMinutes(30);
}
