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
        {
            return false;
        }

        if (!order.IsActive)
        {
            throw new InvalidOperationException(
                "Order đã bị xóa hoặc ngừng hoạt động.");
        }

        if (order.Status == "Cancelled")
        {
            throw new InvalidOperationException(
                "Không thể đổi trạng thái order đã hủy.");
        }

        if (order.Status == "Completed")
        {
            throw new InvalidOperationException(
                "Không thể đổi trạng thái order đã hoàn tất.");
        }

        var table = await _context.RestaurantTables
            .FirstOrDefaultAsync(
                x => x.Id == order.RestaurantTableId,
                cancellationToken);

        if (table == null)
        {
            throw new InvalidOperationException(
                "Bàn của order không tồn tại.");
        }

        var orderItems = await _context.OrderItems
            .Where(x => x.OrderId == order.Id)
            .ToListAsync(cancellationToken);

        if (string.IsNullOrWhiteSpace(request.Status))
        {
            throw new ArgumentException(
                "Trạng thái order không được để trống.");
        }

        var status = request.Status.Trim();

        switch (status)
        {
            case "Pending":
                order.MarkPending();
                table.MarkOccupied();

                foreach (var item in orderItems.Where(
                             x => x.Status != "Cancelled"))
                {
                    item.MarkPending();
                }

                break;

            case "Cooking":
                order.MarkCooking();
                table.MarkOccupied();

                foreach (var item in orderItems.Where(
                             x => x.Status != "Cancelled"))
                {
                    item.MarkCooking();
                }

                break;

            case "Served":
                EnsureOrderCanBeServed(orderItems);

                order.MarkServed();
                table.MarkOccupied();

                foreach (var item in orderItems.Where(
                             x => x.Status == "Ready"))
                {
                    item.MarkServed();
                }

                break;

            case "Completed":
                EnsureOrderCanBeCompleted(order, orderItems);

                order.MarkCompleted();
                table.MarkAvailable();
                break;

            case "Cancelled":
                if (orderItems.Any(x => x.Status == "Served"))
                {
                    throw new InvalidOperationException(
                        "Order có món đã phục vụ nên không thể hủy.");
                }

                order.Cancel();
                table.MarkAvailable();

                foreach (var item in orderItems.Where(
                             x => x.Status != "Cancelled"))
                {
                    item.Cancel();
                }

                break;

            default:
                throw new ArgumentException(
                    "Trạng thái order không hợp lệ.");
        }

        Notification? customerNotification = null;

        if (order.CustomerUserId.HasValue)
        {
            var (title, message, severity) = CustomerStatusNotification(
                order.OrderCode,
                status);

            customerNotification = new Notification(
                order.CustomerUserId.Value,
                $"Order.{status}",
                title,
                message,
                severity,
                "/orders",
                order.Id);

            await _context.Notifications.AddAsync(
                customerNotification,
                cancellationToken);
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
        CustomerStatusNotification(string orderCode, string status)
    {
        return status switch
        {
            "Pending" => (
                "Nhà hàng đã nhận đơn",
                $"Đơn {orderCode} đã được tiếp nhận và đang chờ bếp xử lý.",
                "info"),
            "Cooking" => (
                "Bếp đang chuẩn bị món",
                $"Các món trong đơn {orderCode} đang được chế biến.",
                "info"),
            "Served" => (
                "Đơn đã được phục vụ",
                $"Đơn {orderCode} đã được phục vụ. Chúc bạn ngon miệng!",
                "success"),
            "Completed" => (
                "Đơn đã hoàn tất",
                $"Đơn {orderCode} đã hoàn tất. Cảm ơn bạn đã dùng bữa tại nhà hàng.",
                "success"),
            "Cancelled" => (
                "Đơn đã bị hủy",
                $"Đơn {orderCode} đã bị hủy. Vui lòng liên hệ nhà hàng nếu bạn cần hỗ trợ.",
                "warning"),
            _ => (
                "Trạng thái đơn đã thay đổi",
                $"Đơn {orderCode} vừa được cập nhật trạng thái.",
                "info")
        };
    }

    private static void EnsureOrderCanBeServed(
        IReadOnlyCollection<OrderItem> orderItems)
    {
        var activeItems = orderItems
            .Where(x => x.Status != "Cancelled")
            .ToList();

        if (activeItems.Count == 0)
        {
            throw new InvalidOperationException(
                "Order không còn món để phục vụ.");
        }

        if (activeItems.Any(x =>
                x.Status != "Ready" &&
                x.Status != "Served"))
        {
            throw new InvalidOperationException(
                "Tất cả món phải hoàn thành trước khi phục vụ order.");
        }
    }

    private static void EnsureOrderCanBeCompleted(
        Order order,
        IReadOnlyCollection<OrderItem> orderItems)
    {
        if (order.Status != "Served")
        {
            throw new InvalidOperationException(
                "Chỉ order đã phục vụ mới có thể hoàn tất.");
        }

        var activeItems = orderItems
            .Where(x => x.Status != "Cancelled")
            .ToList();

        if (activeItems.Count == 0 ||
            activeItems.Any(x => x.Status != "Served"))
        {
            throw new InvalidOperationException(
                "Tất cả món phải được phục vụ trước khi hoàn tất order.");
        }
    }
}
