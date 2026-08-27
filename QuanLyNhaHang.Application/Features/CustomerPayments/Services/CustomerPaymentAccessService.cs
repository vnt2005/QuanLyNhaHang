using Microsoft.EntityFrameworkCore;
using QuanLyNhaHang.Application.Common.Interfaces;
using QuanLyNhaHang.Domain.Entities;

namespace QuanLyNhaHang.Application.Features.CustomerPayments.Services;

public sealed class CustomerPaymentAccessService
{
    private static readonly HashSet<string> PayableOrderStatuses = new(StringComparer.Ordinal)
    {
        "Confirmed",
        "Preparing",
        "Cooking",
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

    public static bool CanStartOnlinePayment(Order order)
    {
        if (order.OrderType == "Takeaway" && order.Status == "Pending")
            return true;

        return PayableOrderStatuses.Contains(order.Status);
    }

    public static string GetPaymentUnavailableMessage(Order order)
        => order.Status switch
        {
            "Pending" when order.OrderType == "DineIn" =>
                "Đơn tại bàn đang chờ nhà hàng xác nhận. Vui lòng thanh toán sau khi nhà hàng bắt đầu xử lý món.",
            "Pending" =>
                "Đơn hàng đang chờ thanh toán trước khi nhà hàng bắt đầu chuẩn bị món.",
            "Cancelled" =>
                "Đơn hàng đã hủy, không thể thanh toán.",
            "Completed" =>
                "Đơn hàng đã hoàn tất, không thể tạo thêm giao dịch thanh toán.",
            _ =>
                "Trạng thái đơn hàng hiện không cho phép thanh toán online."
        };

    public static string GetWebhookUnavailableMessage()
        => "Thanh toán chuyển khoản đang tạm khóa vì máy chủ chưa xác nhận được " +
           "kết nối webhook SePay. Vui lòng báo nhà hàng mở lại kênh thanh toán rồi thử lại.";
}
