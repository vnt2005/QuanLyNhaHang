using Microsoft.EntityFrameworkCore;
using QuanLyNhaHang.Application.Common.Interfaces;
using QuanLyNhaHang.Domain.Entities;

namespace QuanLyNhaHang.Application.Features.CustomerPayments.Services;

public sealed class CustomerPaymentAccessService
{
    private static readonly HashSet<string> PayableOrderStatuses = new(StringComparer.Ordinal)
    {
        "Ready",
        "Served"
    };

    private readonly IApplicationDbContext _context;
    private readonly ICurrentUserService _currentUserService;

    public CustomerPaymentAccessService(
        IApplicationDbContext context,
        ICurrentUserService currentUserService)
    {
        _context = context;
        _currentUserService = currentUserService;
    }

    public async Task<Order?> GetAccessibleOrderAsync(
        Guid orderId,
        string? qrToken,
        bool hasPaymentAttemptAccess,
        CancellationToken cancellationToken)
    {
        var order = await _context.Orders
            .FirstOrDefaultAsync(
                item => item.Id == orderId && item.IsActive,
                cancellationToken);

        if (order == null)
            return null;

        if (hasPaymentAttemptAccess)
            return order;

        if (order.CustomerUserId.HasValue)
        {
            return _currentUserService.UserId == order.CustomerUserId.Value
                ? order
                : null;
        }

        if (order.OrderType == "Takeaway")
            return order;

        if (!order.RestaurantTableId.HasValue ||
            string.IsNullOrWhiteSpace(qrToken))
        {
            return null;
        }

        var validQr = await _context.TableQrCodes
            .AsNoTracking()
            .AnyAsync(
                code => code.RestaurantTableId == order.RestaurantTableId.Value &&
                        code.Token == qrToken &&
                        code.IsActive &&
                        code.Status == "Active",
                cancellationToken);

        return validQr ? order : null;
    }

    public static bool CanStartOnlinePayment(
        Order order,
        IReadOnlyCollection<OrderItem>? orderItems = null)
    {
        if (!PayableOrderStatuses.Contains(order.Status))
            return false;

        if (orderItems != null)
        {
            var activeItems = orderItems
                .Where(x => x.Status != "Cancelled")
                .ToList();

            if (activeItems.Count == 0 ||
                activeItems.Any(x => x.Status is not ("Ready" or "Served")))
            {
                return false;
            }
        }

        return true;
    }

    public static string GetPaymentUnavailableMessage(
        Order order,
        IReadOnlyCollection<OrderItem>? orderItems = null)
        => order.Status switch
        {
            "Cancelled" =>
                "Đơn hàng đã hủy, không thể thanh toán.",
            "Completed" =>
                "Đơn hàng đã hoàn tất, không thể tạo thêm giao dịch thanh toán.",
            "Pending" when order.OrderType == "Takeaway" =>
                "Đơn mang về đang chờ nhà hàng tiếp nhận. Vui lòng thanh toán sau khi bếp nấu xong món.",
            "Pending" =>
                "Đơn tại bàn đang chờ nhà hàng tiếp nhận. Vui lòng thanh toán sau khi bếp nấu xong món.",
            "Confirmed" or "Preparing" or "Cooking" when order.OrderType == "Takeaway" =>
                "Bếp đang chuẩn bị và nấu món. Quý khách vui lòng thanh toán sau khi bếp nấu xong.",
            "Confirmed" or "Preparing" or "Cooking" =>
                "Bếp đang nấu món ăn. Quý khách vui lòng thanh toán sau khi bếp hoàn thành.",
            _ when orderItems != null && !orderItems.Any(x => x.Status != "Cancelled") =>
                "Đơn hàng chưa có món hợp lệ để thanh toán.",
            _ when orderItems != null && orderItems.Where(x => x.Status != "Cancelled").Any(x => x.Status is not ("Ready" or "Served")) =>
                "Bếp chưa nấu xong tất cả các món. Quý khách vui lòng thanh toán sau khi bếp hoàn thành.",
            _ =>
                "Trạng thái đơn hàng hiện không cho phép thanh toán online."
        };

    public static string GetWebhookUnavailableMessage()
        => "Thanh toán chuyển khoản đang tạm khóa vì máy chủ chưa xác nhận được " +
           "kết nối webhook SePay. Vui lòng báo nhà hàng mở lại kênh thanh toán rồi thử lại.";
}
