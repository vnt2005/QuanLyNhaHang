using MediatR;
using Microsoft.EntityFrameworkCore;
using QuanLyNhaHang.Application.Common.Constants;
using QuanLyNhaHang.Application.Common.Interfaces;
using QuanLyNhaHang.Application.Common.Notifications;
using QuanLyNhaHang.Application.Features.Notifications.DTOs;
using QuanLyNhaHang.Domain.Entities;

namespace QuanLyNhaHang.Application.Features.CustomerOrders.Commands.Cancel;

public sealed class CancelCustomerOrderCommandHandler
    : IRequestHandler<CancelCustomerOrderCommand, bool>
{
    private readonly IApplicationDbContext _context;
    private readonly ICurrentUserService _currentUserService;
    private readonly IAdminNotificationPublisher _notificationPublisher;

    public CancelCustomerOrderCommandHandler(
        IApplicationDbContext context,
        ICurrentUserService currentUserService,
        IAdminNotificationPublisher notificationPublisher)
    {
        _context = context;
        _currentUserService = currentUserService;
        _notificationPublisher = notificationPublisher;
    }

    public async Task<bool> Handle(
        CancelCustomerOrderCommand request,
        CancellationToken cancellationToken)
    {
        var customerUserId = _currentUserService.UserId
            ?? throw new UnauthorizedAccessException(
                "Vui lòng đăng nhập tài khoản khách hàng.");

        var isActiveCustomer = await _context.Users
            .AsNoTracking()
            .AnyAsync(
                user =>
                    user.Id == customerUserId &&
                    user.Role == SystemRoles.Customer &&
                    user.IsActive &&
                    user.IsEmailVerified,
                cancellationToken);

        if (!isActiveCustomer)
            throw new UnauthorizedAccessException(
                "Tài khoản khách hàng không còn hợp lệ.");

        var order = await _context.Orders
            .FirstOrDefaultAsync(
                item =>
                    item.Id == request.OrderId &&
                    item.CustomerUserId == customerUserId &&
                    item.IsActive,
                cancellationToken);

        if (order == null)
            return false;

        if (order.Status == "Cancelled")
            return true;

        if (order.Status != "Pending")
        {
            throw new InvalidOperationException(
                "Bạn chỉ có thể tự hủy đơn khi đơn còn ở trạng thái Đang chờ. " +
                "Nếu nhà hàng đã bắt đầu xử lý món, vui lòng liên hệ nhân viên để được hỗ trợ.");
        }

        var hasPaidPayment = await _context.Payments
            .AsNoTracking()
            .AnyAsync(
                payment =>
                    payment.OrderId == order.Id &&
                    payment.Status == "Paid",
                cancellationToken);

        if (hasPaidPayment)
        {
            throw new InvalidOperationException(
                "Đơn đã thanh toán nên không thể tự hủy trên website. " +
                "Vui lòng liên hệ nhà hàng để được xử lý hoàn tiền/đối soát.");
        }

        var paymentAttempts = await _context.PaymentAttempts
            .Where(attempt => attempt.OrderId == order.Id)
            .ToListAsync(cancellationToken);

        if (paymentAttempts.Any(attempt =>
                attempt.Status == PaymentAttempt.PaidStatus ||
                attempt.Status == PaymentAttempt.RequiresReviewStatus))
        {
            throw new InvalidOperationException(
                "Đơn đang có giao dịch thanh toán cần đối soát nên chưa thể tự hủy. " +
                "Vui lòng liên hệ nhà hàng để được hỗ trợ.");
        }

        foreach (var attempt in paymentAttempts.Where(attempt =>
                     attempt.Status == PaymentAttempt.CreatingStatus ||
                     attempt.Status == PaymentAttempt.PendingStatus))
        {
            attempt.MarkCancelled("CustomerCancelledOrder");
        }

        var orderItems = await _context.OrderItems
            .Where(item => item.OrderId == order.Id)
            .ToListAsync(cancellationToken);

        if (orderItems.Any(item => item.Status is "Cooking" or "Ready" or "Served"))
        {
            throw new InvalidOperationException(
                "Một hoặc nhiều món đã được bếp xử lý nên đơn không thể tự hủy.");
        }

        order.Cancel();
        foreach (var item in orderItems.Where(item => item.Status != "Cancelled"))
            item.Cancel();

        if (order.RestaurantTableId.HasValue)
        {
            var hasOtherOpenOrderAtTable = await _context.Orders
                .AsNoTracking()
                .AnyAsync(
                    item =>
                        item.Id != order.Id &&
                        item.RestaurantTableId == order.RestaurantTableId &&
                        item.IsActive &&
                        item.Status != "Cancelled" &&
                        item.Status != "Completed",
                    cancellationToken);

            if (!hasOtherOpenOrderAtTable)
            {
                var table = await _context.RestaurantTables
                    .FirstOrDefaultAsync(
                        item => item.Id == order.RestaurantTableId.Value,
                        cancellationToken);
                table?.MarkAvailable();
            }
        }

        var notifications = new List<Notification>
        {
            new(
                customerUserId,
                "Order.CancelledByCustomer",
                "Đã hủy đơn hàng",
                $"Đơn {order.OrderCode} đã được hủy theo yêu cầu của bạn.",
                "warning",
                "/orders",
                order.Id)
        };

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
            "Order.CancelledByCustomer",
            "Khách đã hủy đơn",
            $"Khách hàng vừa hủy đơn {order.OrderCode} khi đơn còn ở trạng thái chờ xử lý.",
            "warning",
            "Đơn hàng",
            order.Id)));

        await _context.Notifications.AddRangeAsync(
            notifications,
            cancellationToken);
        await _context.SaveChangesAsync(cancellationToken);

        await _notificationPublisher.PublishAsync(
            notifications.Select(NotificationDto.FromEntity).ToArray(),
            cancellationToken);

        return true;
    }
}
