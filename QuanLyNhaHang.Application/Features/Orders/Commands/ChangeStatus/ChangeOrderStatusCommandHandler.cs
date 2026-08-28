using MediatR;
using Microsoft.EntityFrameworkCore;
using QuanLyNhaHang.Application.Common.Interfaces;
using QuanLyNhaHang.Application.Features.Notifications.DTOs;
using QuanLyNhaHang.Domain.Entities;

namespace QuanLyNhaHang.Application.Features.Orders.Commands.ChangeStatus;

public class ChangeOrderStatusCommandHandler
    : IRequestHandler<ChangeOrderStatusCommand, bool>
{
    private readonly IApplicationDbContext _context;
    private readonly IAdminNotificationPublisher _notificationPublisher;

    public ChangeOrderStatusCommandHandler(
        IApplicationDbContext context,
        IAdminNotificationPublisher notificationPublisher)
    {
        _context = context;
        _notificationPublisher = notificationPublisher;
    }

    public async Task<bool> Handle(
        ChangeOrderStatusCommand request,
        CancellationToken cancellationToken)
    {
        var order = await _context.Orders
            .FirstOrDefaultAsync(x => x.Id == request.Id, cancellationToken);

        if (order == null)
            return false;

        if (!order.IsActive)
            throw new InvalidOperationException("Order đã bị xóa hoặc ngừng hoạt động.");

        if (order.Status == "Cancelled")
            throw new InvalidOperationException("Không thể đổi trạng thái order đã hủy.");

        if (order.Status == "Completed")
            throw new InvalidOperationException("Không thể đổi trạng thái order đã hoàn tất.");

        RestaurantTable? table = null;
        if (order.RestaurantTableId.HasValue)
        {
            table = await _context.RestaurantTables
                .FirstOrDefaultAsync(x => x.Id == order.RestaurantTableId.Value, cancellationToken);

            if (table == null)
                throw new InvalidOperationException("Bàn của order không tồn tại.");
        }
        else if (order.OrderType != "Takeaway")
        {
            throw new InvalidOperationException("Order tại bàn không có thông tin bàn hợp lệ.");
        }

        var orderItems = await _context.OrderItems
            .Where(x => x.OrderId == order.Id)
            .ToListAsync(cancellationToken);

        if (string.IsNullOrWhiteSpace(request.Status))
            throw new ArgumentException("Trạng thái order không được để trống.");

        var status = request.Status.Trim();
        var effectiveStatus = status;

        switch (status)
        {
            case "Pending":
                order.MarkPending();
                table?.MarkOccupied();
                foreach (var item in orderItems.Where(x => x.Status != "Cancelled"))
                    item.MarkPending();
                break;

            case "Cooking":
                order.MarkCooking();
                table?.MarkOccupied();
                foreach (var item in orderItems.Where(x => x.Status != "Cancelled"))
                    item.MarkCooking();
                break;

            case "Ready":
                if (orderItems.Where(x => x.Status != "Cancelled").Any(x => x.Status is not ("Ready" or "Served")))
                    throw new InvalidOperationException("Tất cả món phải hoàn thành trước khi chuyển order sang sẵn sàng.");
                order.MarkReady();
                table?.MarkOccupied();
                break;

            case "Served":
                EnsureOrderCanBeServed(orderItems);

                if (order.OrderType == "Takeaway")
                {
                    var takeawayPaid = await HasPaidPaymentAsync(
                        order.Id,
                        cancellationToken);
                    if (!takeawayPaid)
                    {
                        throw new InvalidOperationException(
                            "Đơn mang về chưa thanh toán. Sau khi bếp hoàn thành, khách có 5 phút để thanh toán trước khi nhận món.");
                    }
                }

                order.MarkServed();
                table?.MarkOccupied();
                foreach (var item in orderItems.Where(x => x.Status == "Ready"))
                    item.MarkServed();
                break;

            case "Completed":
                EnsureOrderCanBeCompleted(order, orderItems);
                order.MarkCompleted();
                table?.MarkAvailable();
                break;

            case "Cancelled":
                if (orderItems.Any(x => x.Status == "Served"))
                    throw new InvalidOperationException("Order có món đã phục vụ nên không thể hủy.");
                order.Cancel();
                table?.MarkAvailable();
                foreach (var item in orderItems.Where(x => x.Status != "Cancelled"))
                    item.Cancel();
                break;

            default:
                throw new ArgumentException("Trạng thái order không hợp lệ.");
        }

        var isPaid = await HasPaidPaymentAsync(order.Id, cancellationToken);

        if (order.OrderType == "Takeaway" &&
            isPaid &&
            order.Status is "Ready" or "Served")
        {
            var activeItems = orderItems
                .Where(item => item.Status != "Cancelled")
                .ToList();

            if (activeItems.Count > 0 &&
                activeItems.All(item => item.Status is "Ready" or "Served"))
            {
                foreach (var item in activeItems.Where(item => item.Status == "Ready"))
                    item.MarkServed();

                order.MarkCompleted();
                table?.MarkAvailable();
                effectiveStatus = "Completed";
            }
        }
        else if (order.Status == "Served" && isPaid)
        {
            order.MarkCompleted();
            table?.MarkAvailable();
            effectiveStatus = "Completed";
        }

        Notification? customerNotification = null;
        if (order.CustomerUserId.HasValue)
        {
            var (title, message, severity) = CustomerStatusNotification(
                order,
                effectiveStatus,
                isPaid);
            customerNotification = new Notification(
                order.CustomerUserId.Value,
                $"Order.{effectiveStatus}",
                title,
                message,
                severity,
                "/orders",
                order.Id);
            await _context.Notifications.AddAsync(customerNotification, cancellationToken);
        }

        await _context.SaveChangesAsync(cancellationToken);

        if (customerNotification is not null)
        {
            await _notificationPublisher.PublishAsync(
                [NotificationDto.FromEntity(customerNotification)],
                cancellationToken);
        }

        return true;
    }

    private Task<bool> HasPaidPaymentAsync(
        Guid orderId,
        CancellationToken cancellationToken)
        => _context.Payments
            .AsNoTracking()
            .AnyAsync(
                payment => payment.OrderId == orderId && payment.Status == "Paid",
                cancellationToken);

    private static (string Title, string Message, string Severity)
        CustomerStatusNotification(Order order, string status, bool isPaid)
    {
        var takeaway = order.OrderType == "Takeaway";
        return status switch
        {
            "Pending" => ("Nhà hàng đã nhận đơn", $"Đơn {order.OrderCode} đã được tiếp nhận và đang chờ bếp xử lý.", "info"),
            "Cooking" => ("Bếp đang chuẩn bị món", $"Các món trong đơn {order.OrderCode} đang được chế biến.", "info"),
            "Ready" when takeaway && !isPaid => (
                "Đơn mang về đã sẵn sàng - còn 5 phút thanh toán",
                $"Đơn {order.OrderCode} đã nấu xong. Vui lòng thanh toán trong 5 phút; quá thời hạn hệ thống sẽ tự động hủy đơn.",
                "warning"),
            "Ready" => (takeaway ? "Đơn mang về đã sẵn sàng" : "Món đã sẵn sàng", takeaway ? $"Đơn {order.OrderCode} đã sẵn sàng để bạn đến nhận." : $"Các món trong đơn {order.OrderCode} đã sẵn sàng phục vụ.", "success"),
            "Served" => (takeaway ? "Đơn mang về đã được giao" : "Đơn đã được phục vụ", takeaway ? $"Đơn {order.OrderCode} đã được giao cho khách." : $"Đơn {order.OrderCode} đã được phục vụ. Chúc bạn ngon miệng!", "success"),
            "Completed" => ("Đơn đã hoàn tất", takeaway ? $"Đơn mang về {order.OrderCode} đã nấu xong và thanh toán thành công. Cảm ơn bạn đã đặt món." : $"Đơn {order.OrderCode} đã hoàn tất. Cảm ơn bạn đã dùng bữa tại nhà hàng.", "success"),
            "Cancelled" => ("Đơn đã bị hủy", $"Đơn {order.OrderCode} đã bị hủy. Vui lòng liên hệ nhà hàng nếu bạn cần hỗ trợ.", "warning"),
            _ => ("Trạng thái đơn đã thay đổi", $"Đơn {order.OrderCode} vừa được cập nhật trạng thái.", "info")
        };
    }

    private static void EnsureOrderCanBeServed(IReadOnlyCollection<OrderItem> orderItems)
    {
        var activeItems = orderItems.Where(x => x.Status != "Cancelled").ToList();
        if (activeItems.Count == 0)
            throw new InvalidOperationException("Order không còn món để phục vụ.");
        if (activeItems.Any(x => x.Status != "Ready" && x.Status != "Served"))
            throw new InvalidOperationException("Tất cả món phải hoàn thành trước khi phục vụ order.");
    }

    private static void EnsureOrderCanBeCompleted(Order order, IReadOnlyCollection<OrderItem> orderItems)
    {
        if (order.Status != "Served")
            throw new InvalidOperationException("Chỉ order đã phục vụ mới có thể hoàn tất.");
        var activeItems = orderItems.Where(x => x.Status != "Cancelled").ToList();
        if (activeItems.Count == 0 || activeItems.Any(x => x.Status != "Served"))
            throw new InvalidOperationException("Tất cả món phải được phục vụ trước khi hoàn tất order.");
    }
}
