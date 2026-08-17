using MediatR;
using Microsoft.EntityFrameworkCore;
using QuanLyNhaHang.Application.Common.Interfaces;
using QuanLyNhaHang.Application.Features.Notifications.DTOs;
using QuanLyNhaHang.Domain.Entities;

namespace QuanLyNhaHang.Application.Features.Kitchen.Commands.Update;

public class UpdateKitchenOrderItemStatusCommandHandler
    : IRequestHandler<UpdateKitchenOrderItemStatusCommand, bool>
{
    private readonly IApplicationDbContext _context;
    private readonly IAdminNotificationPublisher _notificationPublisher;

    public UpdateKitchenOrderItemStatusCommandHandler(
        IApplicationDbContext context,
        IAdminNotificationPublisher notificationPublisher)
    {
        _context = context;
        _notificationPublisher = notificationPublisher;
    }

    public async Task<bool> Handle(
        UpdateKitchenOrderItemStatusCommand request,
        CancellationToken cancellationToken)
    {
        var orderItem = await _context.OrderItems
            .FirstOrDefaultAsync(x => x.Id == request.OrderItemId, cancellationToken);

        if (orderItem == null)
            throw new Exception("Không tìm thấy món trong đơn hàng.");

        var order = await _context.Orders
            .FirstOrDefaultAsync(x => x.Id == orderItem.OrderId, cancellationToken);

        if (order == null)
            throw new Exception("Không tìm thấy đơn hàng của món.");

        var orderItems = await _context.OrderItems
            .Where(x => x.OrderId == orderItem.OrderId)
            .ToListAsync(cancellationToken);

        var previousOrderStatus = order.Status;
        orderItem.UpdateNote(request.Note);

        switch (request.Status)
        {
            case "Pending": orderItem.MarkPending(); break;
            case "Cooking": orderItem.MarkCooking(); break;
            case "Ready": orderItem.MarkReady(); break;
            case "Served": orderItem.MarkServed(); break;
            case "Cancelled": orderItem.Cancel(); break;
            default: throw new Exception("Trạng thái món không hợp lệ.");
        }

        SynchronizeOrderStatus(order, orderItems);

        Notification? customerNotification = null;
        if (order.CustomerUserId.HasValue && order.Status != previousOrderStatus)
        {
            var (title, message, severity) = CustomerStatusNotification(order);
            customerNotification = new Notification(
                order.CustomerUserId.Value,
                $"Order.{order.Status}",
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

    private static void SynchronizeOrderStatus(
        Order order,
        IReadOnlyCollection<OrderItem> orderItems)
    {
        var activeItems = orderItems.Where(x => x.Status != "Cancelled").ToList();

        if (activeItems.Count == 0)
        {
            order.Cancel();
            return;
        }

        if (activeItems.All(x => x.Status == "Served"))
        {
            order.MarkServed();
            return;
        }

        if (activeItems.All(x => x.Status is "Ready" or "Served"))
        {
            order.MarkReady();
            return;
        }

        if (activeItems.Any(x => x.Status is "Cooking" or "Ready" or "Served"))
        {
            order.MarkCooking();
            return;
        }

        order.MarkPending();
    }

    private static (string Title, string Message, string Severity)
        CustomerStatusNotification(Order order)
    {
        var takeaway = order.OrderType == "Takeaway";
        return order.Status switch
        {
            "Cooking" => ("Bếp đang chuẩn bị món", $"Các món trong đơn {order.OrderCode} đang được chế biến.", "info"),
            "Ready" => (takeaway ? "Đơn mang về đã sẵn sàng" : "Món đã sẵn sàng", takeaway ? $"Đơn {order.OrderCode} đã sẵn sàng để bạn đến nhận." : $"Các món trong đơn {order.OrderCode} đã sẵn sàng phục vụ.", "success"),
            "Served" => (takeaway ? "Đơn mang về đã được giao" : "Đơn đã được phục vụ", takeaway ? $"Đơn {order.OrderCode} đã được giao cho khách." : $"Đơn {order.OrderCode} đã được phục vụ. Chúc bạn ngon miệng!", "success"),
            "Cancelled" => ("Đơn đã bị hủy", $"Đơn {order.OrderCode} đã bị hủy. Vui lòng liên hệ nhà hàng nếu bạn cần hỗ trợ.", "warning"),
            _ => ("Trạng thái đơn đã thay đổi", $"Đơn {order.OrderCode} vừa được cập nhật trạng thái.", "info")
        };
    }
}
