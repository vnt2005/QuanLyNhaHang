using MediatR;
using Microsoft.EntityFrameworkCore;
using QuanLyNhaHang.Application.Common.Interfaces;
using QuanLyNhaHang.Application.Features.Notifications.DTOs;
using QuanLyNhaHang.Domain.Entities;

namespace QuanLyNhaHang.Application.Features.Orders.Commands.Delete;

public class DeleteOrderCommandHandler : IRequestHandler<DeleteOrderCommand, bool>
{
    private readonly IApplicationDbContext _context;
    private readonly IAdminNotificationPublisher _notificationPublisher;

    public DeleteOrderCommandHandler(
        IApplicationDbContext context,
        IAdminNotificationPublisher notificationPublisher)
    {
        _context = context;
        _notificationPublisher = notificationPublisher;
    }

    public async Task<bool> Handle(
        DeleteOrderCommand request,
        CancellationToken cancellationToken)
    {
        var order = await _context.Orders
            .FirstOrDefaultAsync(x => x.Id == request.Id, cancellationToken);

        if (order == null)
            return false;

        if (order.Status == "Completed")
            throw new Exception("Không thể xóa order đã hoàn tất.");

        var orderItems = await _context.OrderItems
            .Where(x => x.OrderId == order.Id)
            .ToListAsync(cancellationToken);

        order.Cancel();
        order.Deactivate();

        foreach (var item in orderItems)
            item.Cancel();

        if (order.RestaurantTableId.HasValue)
        {
            var table = await _context.RestaurantTables
                .FirstOrDefaultAsync(x => x.Id == order.RestaurantTableId.Value, cancellationToken);

            if (table == null)
                throw new Exception("Bàn của order không tồn tại.");

            table.MarkAvailable();
        }

        Notification? customerNotification = null;
        if (order.CustomerUserId.HasValue)
        {
            customerNotification = new Notification(
                order.CustomerUserId.Value,
                "Order.Cancelled",
                "Đơn đã bị hủy",
                $"Đơn {order.OrderCode} đã bị nhà hàng hủy. Vui lòng liên hệ nhà hàng nếu bạn cần hỗ trợ.",
                "warning",
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
}
