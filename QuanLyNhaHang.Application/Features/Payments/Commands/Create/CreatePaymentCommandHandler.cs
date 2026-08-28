using MediatR;
using Microsoft.EntityFrameworkCore;
using QuanLyNhaHang.Application.Common.Interfaces;
using QuanLyNhaHang.Application.Common.Notifications;
using QuanLyNhaHang.Application.Common.Payments;
using QuanLyNhaHang.Application.Features.Notifications.DTOs;
using QuanLyNhaHang.Application.Features.Payments.DTOs;
using QuanLyNhaHang.Domain.Entities;

namespace QuanLyNhaHang.Application.Features.Payments.Commands.Create;

public class CreatePaymentCommandHandler : IRequestHandler<CreatePaymentCommand, PaymentDto>
{
    private readonly IApplicationDbContext _context;
    private readonly IAdminNotificationPublisher _notificationPublisher;

    public CreatePaymentCommandHandler(IApplicationDbContext context, IAdminNotificationPublisher notificationPublisher)
    {
        _context = context;
        _notificationPublisher = notificationPublisher;
    }

    public async Task<PaymentDto> Handle(CreatePaymentCommand request, CancellationToken cancellationToken)
    {
        var order = await _context.Orders.FirstOrDefaultAsync(x => x.Id == request.OrderId, cancellationToken)
            ?? throw new KeyNotFoundException("Không tìm thấy đơn hàng.");
        if (order.Status == "Completed") throw new InvalidOperationException("Đơn hàng này đã hoàn tất thanh toán.");
        if (order.Status == "Cancelled") throw new InvalidOperationException("Đơn hàng đã hủy, không thể thanh toán.");
        if (await _context.Payments.AnyAsync(x => x.OrderId == request.OrderId && x.Status == "Paid", cancellationToken))
            throw new InvalidOperationException("Đơn hàng này đã được thanh toán.");

        await EnsureManualPaymentIsSafeAsync(request.OrderId, cancellationToken);

        var orderItems = await _context.OrderItems.Where(x => x.OrderId == request.OrderId && x.Status != "Cancelled").ToListAsync(cancellationToken);
        if (orderItems.Count == 0) throw new InvalidOperationException("Đơn hàng chưa có món để thanh toán.");
        if (orderItems.Any(x => x.Status is "Pending" or "Cooking"))
            throw new InvalidOperationException("Đơn hàng còn món chưa hoàn thành, chưa thể thanh toán.");
        foreach (var item in orderItems.Where(x => x.Status == "Ready")) item.MarkServed();

        var totalAmount = orderItems.Sum(x => x.TotalPrice);
        var promotionUsage = await _context.PromotionUsages.FirstOrDefaultAsync(x => x.OrderId == request.OrderId && x.Status == "Applied", cancellationToken);
        var discountAmount = promotionUsage?.DiscountAmount ?? request.DiscountAmount;
        var serviceChargeAmount = request.ServiceChargeAmount;
        var vatAmount = request.VatAmount;
        if (order.OrderType == "Takeaway")
        {
            var settings = await _context.RestaurantSettings.AsNoTracking().Where(x => x.IsActive).OrderByDescending(x => x.UpdatedAt ?? x.CreatedAt).FirstOrDefaultAsync(cancellationToken);
            var afterDiscount = Math.Max(0, totalAmount - discountAmount);
            serviceChargeAmount = 0;
            vatAmount = decimal.Round(afterDiscount * (settings?.DefaultVatPercent ?? 0) / 100m, 0, MidpointRounding.AwayFromZero);
        }

        var payment = new Payment(request.OrderId, totalAmount, discountAmount, vatAmount, request.CustomerPaid, request.PaymentMethod, request.Note, serviceChargeAmount);
        await _context.Payments.AddAsync(payment, cancellationToken);
        promotionUsage?.SetPayment(payment.Id);
        order.UpdateTotalAmount(totalAmount);
        order.MarkCompleted();

        if (order.RestaurantTableId.HasValue)
        {
            var table = await _context.RestaurantTables.FirstOrDefaultAsync(x => x.Id == order.RestaurantTableId.Value, cancellationToken);
            table?.MarkAvailable();
        }

        await PaidOrderInvoiceIssuer.IssueAsync(_context, order, payment, request.Note ?? "Phát hành tự động sau thanh toán", cancellationToken);

        var notifications = new List<Notification>();
        if (order.CustomerUserId.HasValue)
            notifications.Add(new Notification(order.CustomerUserId.Value, "Payment.Paid", "Thanh toán thành công", $"Đơn {order.OrderCode} đã được ghi nhận thanh toán thành công.", "success", "/orders", order.Id));
        var adminUserIds = await _context.Users.AsNoTracking().Where(user => user.IsActive && user.IsEmailVerified && AdminNotificationAudience.OrderRoles.Contains(user.Role)).Select(user => user.Id).ToListAsync(cancellationToken);
        notifications.AddRange(adminUserIds.Select(userId => new Notification(userId, "Payment.Paid", "Đã ghi nhận thanh toán", $"Đơn {order.OrderCode} đã được ghi nhận thanh toán thành công.", "success", "Thanh toán", order.Id)));
        if (notifications.Count > 0) await _context.Notifications.AddRangeAsync(notifications, cancellationToken);

        await _context.SaveChangesAsync(cancellationToken);
        if (notifications.Count > 0) await _notificationPublisher.PublishAsync(notifications.Select(NotificationDto.FromEntity).ToArray(), cancellationToken);

        return new PaymentDto
        {
            Id = payment.Id,
            OrderId = payment.OrderId,
            PaymentCode = payment.PaymentCode,
            TotalAmount = payment.TotalAmount,
            DiscountAmount = payment.DiscountAmount,
            ServiceChargeAmount = payment.ServiceChargeAmount,
            VatAmount = payment.VatAmount,
            FinalAmount = payment.FinalAmount,
            CustomerPaid = payment.CustomerPaid,
            ChangeAmount = payment.ChangeAmount,
            PaymentMethod = payment.PaymentMethod,
            Status = payment.Status,
            Note = payment.Note,
            PaidAt = payment.PaidAt,
            CreatedAt = payment.CreatedAt,
            UpdatedAt = payment.UpdatedAt
        };
    }

    private async Task EnsureManualPaymentIsSafeAsync(Guid orderId, CancellationToken cancellationToken)
    {
        var attempts = await _context.PaymentAttempts
            .Where(attempt => attempt.OrderId == orderId && (attempt.Status == PaymentAttempt.CreatingStatus || attempt.Status == PaymentAttempt.PendingStatus || attempt.Status == PaymentAttempt.PaidStatus || attempt.Status == PaymentAttempt.RequiresReviewStatus))
            .OrderByDescending(attempt => attempt.CreatedAt)
            .ToListAsync(cancellationToken);
        var now = DateTime.UtcNow;
        foreach (var attempt in attempts)
        {
            if (attempt.Status is PaymentAttempt.CreatingStatus or PaymentAttempt.PendingStatus)
            {
                if (attempt.ExpiresAt <= now)
                {
                    attempt.MarkExpired();
                    continue;
                }
                throw new InvalidOperationException("Đơn hàng đang có phiên thanh toán online còn hiệu lực. Không được thu tiền thủ công trong lúc khách có thể vẫn đang chuyển khoản. Hãy để khách hoàn tất, hủy phiên online hoặc chờ phiên hết hạn trước khi thanh toán tại quầy.");
            }
            if (attempt.Status == PaymentAttempt.RequiresReviewStatus)
                throw new InvalidOperationException("Đơn hàng có giao dịch online đang chờ đối soát. Không được thu thêm tiền cho đến khi giao dịch này được xử lý.");
            if (attempt.Status == PaymentAttempt.PaidStatus)
                throw new InvalidOperationException("Nhà cung cấp đã ghi nhận đơn hàng này thanh toán online. Không được tạo thêm thanh toán thủ công.");
        }
    }
}
