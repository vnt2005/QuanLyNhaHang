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
}
