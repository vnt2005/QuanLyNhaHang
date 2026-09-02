using MediatR;
using Microsoft.EntityFrameworkCore;
using QuanLyNhaHang.Application.Common.Interfaces;
using QuanLyNhaHang.Application.Common.Notifications;
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
            .FirstOrDefaultAsync(x => x.Id == request.OrderItemId, cancellationToken)
            ?? throw new KeyNotFoundException("Không tìm thấy món trong đơn hàng.");

        var order = await _context.Orders
            .FirstOrDefaultAsync(x => x.Id == orderItem.OrderId, cancellationToken)
            ?? throw new KeyNotFoundException("Không tìm thấy đơn hàng của món.");

        if (order.Status == "Cancelled")
            throw new InvalidOperationException("Không thể cập nhật bếp cho đơn đã hủy.");
        if (order.Status == "Completed")
            throw new InvalidOperationException("Không thể cập nhật bếp cho đơn đã hoàn tất.");

        var orderItems = await _context.OrderItems
            .Where(x => x.OrderId == orderItem.OrderId)
            .ToListAsync(cancellationToken);
        var isPaid = await HasPaidPaymentAsync(order.Id, cancellationToken);

        if (request.Status == "Cancelled" && isPaid)
        {
            throw new InvalidOperationException(
                "Đơn hàng đã thanh toán. Không thể hủy món trong bếp vì sẽ làm lệch số tiền đã thu, hóa đơn và báo cáo doanh thu.");
        }

        if (request.Status == "Served" && order.OrderType == "Takeaway" && !isPaid)
        {
            throw new InvalidOperationException(
                "Đơn mang về chưa thanh toán. Sau khi bếp hoàn thành, khách có 5 phút để thanh toán trước khi nhận món.");
        }

        var previousOrderStatus = order.Status;
        orderItem.UpdateNote(request.Note);

        switch (request.Status)
        {
            case "Pending": orderItem.MarkPending(); break;
            case "Cooking": orderItem.MarkCooking(); break;
            case "Ready": orderItem.MarkReady(); break;
            case "Served": orderItem.MarkServed(); break;
            case "Cancelled": orderItem.Cancel(); break;
            default:
                throw new ArgumentException(
                    "Trạng thái món không hợp lệ.",
                    nameof(request.Status));
        }

        SynchronizeOrderStatus(order, orderItems);
        var effectiveStatus = order.Status;

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
                effectiveStatus = "Completed";
            }
        }

        var notifications = new List<Notification>();
        if (order.CustomerUserId.HasValue && effectiveStatus != previousOrderStatus)
        {
            var (title, message, severity) = CustomerStatusNotification(
                order,
                effectiveStatus,
                isPaid);
            notifications.Add(new Notification(
                order.CustomerUserId.Value,
                $"Order.{effectiveStatus}",
                title,
                message,
                severity,
                "/orders",
                order.Id));
        }

        if (order.OrderType == "Takeaway" &&
            effectiveStatus == "Ready" &&
            !isPaid &&
            previousOrderStatus != "Ready")
        {
            var adminUserIds = await _context.Users
                .AsNoTracking()
                .Where(user =>
                    user.IsActive &&
                    user.IsEmailVerified &&
                    AdminNotificationAudience.OrderAndReservationRoles.Contains(user.Role))
                .Select(user => user.Id)
                .ToListAsync(cancellationToken);

            notifications.AddRange(adminUserIds.Select(userId => new Notification(
                userId,
                "Payment.ReadyForPayment",
                "Đơn mang về đã nấu xong - chờ thanh toán",
                $"Đơn {order.OrderCode} đã Ready nhưng chưa thanh toán. Khách còn 5 phút để thanh toán trước khi hệ thống tự hủy.",
                "warning",
                "Thanh toán",
                order.Id)));
        }

        if (notifications.Count > 0)
            await _context.Notifications.AddRangeAsync(notifications, cancellationToken);

        await _context.SaveChangesAsync(cancellationToken);

        if (notifications.Count > 0)
        {
            await _notificationPublisher.PublishAsync(
                notifications.Select(NotificationDto.FromEntity).ToArray(),
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
        CustomerStatusNotification(
            Order order,
            string status,
            bool isPaid)
    {
        var takeaway = order.OrderType == "Takeaway";
        return status switch
        {
            "Cooking" => ("Bếp đang chuẩn bị món", $"Các món trong đơn {order.OrderCode} đang được chế biến.", "info"),
            "Ready" when takeaway && !isPaid => (
                "Đơn mang về đã sẵn sàng - còn 5 phút thanh toán",
                $"Đơn {order.OrderCode} đã nấu xong. Vui lòng thanh toán trong 5 phút; quá thời hạn hệ thống sẽ tự động hủy đơn.",
                "warning"),
            "Ready" => (takeaway ? "Đơn mang về đã sẵn sàng" : "Món đã sẵn sàng", takeaway ? $"Đơn {order.OrderCode} đã sẵn sàng để bạn đến nhận." : $"Các món trong đơn {order.OrderCode} đã sẵn sàng phục vụ.", "success"),
            "Served" => (takeaway ? "Đơn mang về đã được giao" : "Đơn đã được phục vụ", takeaway ? $"Đơn {order.OrderCode} đã được giao cho khách." : $"Đơn {order.OrderCode} đã được phục vụ. Chúc bạn ngon miệng!", "success"),
            "Completed" => ("Đơn đã hoàn tất", takeaway ? $"Đơn mang về {order.OrderCode} đã nấu xong và thanh toán thành công. Cảm ơn bạn đã đặt món." : $"Đơn {order.OrderCode} đã hoàn tất.", "success"),
            "Cancelled" => ("Đơn đã bị hủy", $"Đơn {order.OrderCode} đã bị hủy. Vui lòng liên hệ nhà hàng nếu bạn cần hỗ trợ.", "warning"),
            _ => ("Trạng thái đơn đã thay đổi", $"Đơn {order.OrderCode} vừa được cập nhật trạng thái.", "info")
        };
    }
}
