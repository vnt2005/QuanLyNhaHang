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

        var hasPaidPayment = await _context.Payments
            .AsNoTracking()
            .AnyAsync(
                payment => payment.OrderId == order.Id && payment.Status == "Paid",
                cancellationToken);
        if (hasPaidPayment)
        {
            throw new InvalidOperationException(
                "Đơn hàng đã thanh toán. Không thể hủy/xóa trực tiếp vì sẽ làm sai thanh toán, hóa đơn và báo cáo doanh thu. Hãy xử lý hoàn tiền/đối soát theo quy trình riêng.");
        }

        var hasReviewPayment = await _context.PaymentAttempts
            .AsNoTracking()
            .AnyAsync(
                attempt => attempt.OrderId == order.Id &&
                           attempt.Status == PaymentAttempt.RequiresReviewStatus,
                cancellationToken);
        if (hasReviewPayment)
        {
            throw new InvalidOperationException(
                "Đơn hàng đang có giao dịch thanh toán cần đối soát. Không thể hủy/xóa trước khi xử lý giao dịch này.");
        }

        var orderItems = await _context.OrderItems
            .Where(x => x.OrderId == order.Id)
            .ToListAsync(cancellationToken);

        var paymentAttempts = await _context.PaymentAttempts
            .Where(attempt => attempt.OrderId == order.Id)
            .ToListAsync(cancellationToken);
        foreach (var attempt in paymentAttempts.Where(attempt =>
                     attempt.Status == PaymentAttempt.CreatingStatus ||
                     attempt.Status == PaymentAttempt.PendingStatus))
        {
            attempt.MarkCancelled("AdminCancelledOrder");
        }

        order.Cancel();
        order.Deactivate();

        foreach (var item in orderItems.Where(item => item.Status != "Cancelled"))
            item.Cancel();

        if (order.RestaurantTableId.HasValue)
        {
            var hasOtherOpenOrderAtTable = await _context.Orders
                .AsNoTracking()
                .AnyAsync(
                    item => item.Id != order.Id &&
                            item.RestaurantTableId == order.RestaurantTableId &&
                            item.IsActive &&
                            item.Status != "Cancelled" &&
                            item.Status != "Completed",
                    cancellationToken);

            if (!hasOtherOpenOrderAtTable)
            {
                var table = await _context.RestaurantTables
                    .FirstOrDefaultAsync(
                        x => x.Id == order.RestaurantTableId.Value,
                        cancellationToken);

                if (table == null)
                    throw new Exception("Bàn của order không tồn tại.");

                table.MarkAvailable();
            }
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
