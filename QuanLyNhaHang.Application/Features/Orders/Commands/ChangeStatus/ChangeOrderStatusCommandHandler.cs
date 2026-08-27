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

        if (order.OrderType == "Takeaway" &&
            order.Status == "Pending" &&
            status == "Cooking")
        {
            var paid = await _context.Payments
                .AsNoTracking()
                .AnyAsync(
                    payment =>
                        payment.OrderId == order.Id &&
                        payment.Status == "Paid",
                    cancellationToken);

            if (!paid)
            {
                throw new InvalidOperationException(
                    "Đơn mang về từ CustomerWeb chưa thanh toán. " +
                    "Không được chuyển sang chế biến trước khi hệ thống ghi nhận Payment Paid.");
            }
        }

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
                order.MarkServed();
                table?.MarkOccupied();
                foreach (var item in orderItems.Where(x => x.Status == "Ready"))
                    item.MarkServed();

                var alreadyPaid = await _context.Payments
                    .AsNoTracking()
                    .AnyAsync(
                        payment => payment.OrderId == order.Id && payment.Status == "Paid",
                        cancellationToken);
                if (alreadyPaid)
                {
                    order.MarkCompleted();
                    table?.MarkAvailable();
                    effectiveStatus = "Completed";
                }
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

        Notification? customerNotification = null;
        if (order.CustomerUserId.HasValue)
        {
            var (title, message, severity) = CustomerStatusNotification(order, effectiveStatus);
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

    private static (string Title, string Message, string Severity)
        CustomerStatusNotification(Order order, string status)
    {
        var takeaway = order.OrderType == "Takeaway";
        return status switch
        {
            "Pending" => ("Nhà hàng đã nhận đơn", $"Đơn {order.OrderCode} đã được tiếp nhận và đang chờ bếp xử lý.", "info"),
            "Cooking" => ("Bếp đang chuẩn bị món", $"Các món trong đơn {order.OrderCode} đang được chế biến.", "info"),
            "Ready" => (takeaway ? "Đơn mang về đã sẵn sàng" : "Món đã sẵn sàng", takeaway ? $"Đơn {order.OrderCode} đã sẵn sàng để bạn đến nhận." : $"Các món trong đơn {order.OrderCode} đã sẵn sàng phục vụ.", "success"),
            "Served" => (takeaway ? "Đơn mang về đã được giao" : "Đơn đã được phục vụ", takeaway ? $"Đơn {order.OrderCode} đã được giao cho khách." : $"Đơn {order.OrderCode} đã được phục vụ. Chúc bạn ngon miệng!", "success"),
            "Completed" => ("Đơn đã hoàn tất", takeaway ? $"Đơn mang về {order.OrderCode} đã hoàn tất. Cảm ơn bạn đã đặt món." : $"Đơn {order.OrderCode} đã hoàn tất. Cảm ơn bạn đã dùng bữa tại nhà hàng.", "success"),
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
