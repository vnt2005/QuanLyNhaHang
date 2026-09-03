using MediatR;
using Microsoft.EntityFrameworkCore;
using QuanLyNhaHang.Application.Common.Constants;
using QuanLyNhaHang.Application.Common.Interfaces;
using QuanLyNhaHang.Application.Common.Notifications;
using QuanLyNhaHang.Application.Common.Payments;
using QuanLyNhaHang.Application.Features.CustomerPayments.Services;
using QuanLyNhaHang.Application.Features.Notifications.DTOs;
using QuanLyNhaHang.Application.Features.Payments.DTOs;
using QuanLyNhaHang.Domain.Entities;
using QuanLyNhaHang.Domain.Payments;

namespace QuanLyNhaHang.Application.Features.Payments.Commands.Create;

public class CreatePaymentCommandHandler : IRequestHandler<CreatePaymentCommand, PaymentDto>
{
    private readonly IApplicationDbContext _context;
    private readonly IAdminNotificationPublisher _notificationPublisher;
    private readonly CustomerPaymentQuoteService _quoteService;
    private readonly ICurrentUserService _currentUserService;

    public CreatePaymentCommandHandler(
        IApplicationDbContext context,
        IAdminNotificationPublisher notificationPublisher,
        CustomerPaymentQuoteService quoteService,
        ICurrentUserService currentUserService)
    {
        _context = context;
        _notificationPublisher = notificationPublisher;
        _quoteService = quoteService;
        _currentUserService = currentUserService;
    }

    public async Task<PaymentDto> Handle(
        CreatePaymentCommand request,
        CancellationToken cancellationToken)
    {
        await EnsureCounterPaymentRoleAsync(cancellationToken);

        var paymentMethod = request.PaymentMethod?.Trim() ?? string.Empty;
        var methodDefinition = PaymentMethodCatalog.Find(paymentMethod)
            ?? throw new ArgumentException("Phương thức thanh toán không hợp lệ.");

        if (!methodDefinition.AvailableAtCounter)
        {
            throw new InvalidOperationException(
                "Chuyển khoản QR/ngân hàng không được phép ghi nhận thủ công tại Web App. Trạng thái Paid chỉ được tạo từ payment attempt và giao dịch SePay/webhook đã đối soát hợp lệ.");
        }

        if (string.IsNullOrWhiteSpace(request.Note))
        {
            throw new InvalidOperationException(
                "Thanh toán tại quầy bắt buộc ghi rõ lý do hoặc thông tin đối chiếu để phục vụ kiểm toán.");
        }

        var order = await _context.Orders
            .FirstOrDefaultAsync(x => x.Id == request.OrderId, cancellationToken)
            ?? throw new KeyNotFoundException("Không tìm thấy đơn hàng.");

        if (order.Status == "Completed")
            throw new InvalidOperationException("Đơn hàng này đã hoàn tất thanh toán.");
        if (order.Status == "Cancelled")
            throw new InvalidOperationException("Đơn hàng đã hủy, không thể thanh toán.");
        if (await _context.Payments.AnyAsync(
                x => x.OrderId == request.OrderId && x.Status == "Paid",
                cancellationToken))
        {
            throw new InvalidOperationException("Đơn hàng này đã được thanh toán.");
        }

        await EnsureManualPaymentIsSafeAsync(request.OrderId, cancellationToken);

        var orderItems = await _context.OrderItems
            .Where(x => x.OrderId == request.OrderId && x.Status != "Cancelled")
            .ToListAsync(cancellationToken);

        if (orderItems.Count == 0)
            throw new InvalidOperationException("Đơn hàng chưa có món để thanh toán.");

        if (order.OrderType == "Takeaway")
        {
            if (order.Status is not ("Ready" or "Served") ||
                orderItems.Any(x => x.Status is not ("Ready" or "Served")))
            {
                throw new InvalidOperationException(
                    "Đơn mang về chỉ được thu tiền tại quầy sau khi món đã sẵn sàng hoặc đã phục vụ.");
            }
        }
        else
        {
            if (order.Status != "Served" || orderItems.Any(x => x.Status != "Served"))
            {
                throw new InvalidOperationException(
                    "Đơn tại bàn chỉ được thu tiền tại quầy sau khi toàn bộ món đã được phục vụ.");
            }
        }

        var quote = await _quoteService.CalculateAsync(order, cancellationToken);

        if (request.DiscountAmount != quote.DiscountAmount ||
            request.ServiceChargeAmount != quote.ServiceChargeAmount ||
            request.VatAmount != quote.VatAmount)
        {
            throw new InvalidOperationException(
                "Số tiền giảm giá, phí phục vụ hoặc VAT do client gửi không khớp số tiền backend tính toán. Vui lòng tải lại dữ liệu thanh toán.");
        }

        if (paymentMethod == PaymentMethodCatalog.Cash)
        {
            if (request.CustomerPaid < quote.FinalAmount)
                throw new ArgumentException("Số tiền khách đưa không đủ để thanh toán.");
        }
        else if (request.CustomerPaid != quote.FinalAmount)
        {
            throw new InvalidOperationException(
                "Thanh toán không dùng tiền mặt phải ghi nhận đúng số tiền backend yêu cầu; không được tự khai báo số tiền khác.");
        }

        var payment = new Payment(
            request.OrderId,
            quote.Subtotal,
            quote.DiscountAmount,
            quote.VatAmount,
            request.CustomerPaid,
            paymentMethod,
            request.Note,
            quote.ServiceChargeAmount);

        await _context.Payments.AddAsync(payment, cancellationToken);

        var promotionUsage = await _context.PromotionUsages
            .FirstOrDefaultAsync(
                x => x.OrderId == request.OrderId && x.Status == "Applied",
                cancellationToken);
        promotionUsage?.SetPayment(payment.Id);

        order.UpdateTotalAmount(quote.Subtotal);
        foreach (var item in orderItems.Where(x => x.Status == "Ready"))
            item.MarkServed();
        order.MarkCompleted();

        if (order.RestaurantTableId.HasValue)
        {
            var table = await _context.RestaurantTables
                .FirstOrDefaultAsync(
                    x => x.Id == order.RestaurantTableId.Value,
                    cancellationToken);
            table?.MarkAvailable();
        }

        await PaidOrderInvoiceIssuer.IssueAsync(
            _context,
            order,
            payment,
            request.Note,
            cancellationToken);

        var notifications = new List<Notification>();
        if (order.CustomerUserId.HasValue)
        {
            notifications.Add(new Notification(
                order.CustomerUserId.Value,
                "Payment.Paid",
                "Thanh toán thành công",
                $"Đơn {order.OrderCode} đã được ghi nhận thanh toán tại quầy bằng {methodDefinition.DisplayName}.",
                "success",
                "/orders",
                order.Id));
        }

        var adminUserIds = await _context.Users
            .AsNoTracking()
            .Where(user =>
                user.IsActive &&
                user.IsEmailVerified &&
                AdminNotificationAudience.OrderRoles.Contains(user.Role))
            .Select(user => user.Id)
            .ToListAsync(cancellationToken);

        notifications.AddRange(adminUserIds.Select(userId => new Notification(
            userId,
            "Payment.PaidAtCounter",
            "Đã ghi nhận thanh toán tại quầy",
            $"Đơn {order.OrderCode} đã thanh toán bằng {methodDefinition.DisplayName}.",
            "success",
            "Thanh toán",
            order.Id)));

        if (notifications.Count > 0)
            await _context.Notifications.AddRangeAsync(notifications, cancellationToken);

        await _context.SaveChangesAsync(cancellationToken);

        if (notifications.Count > 0)
        {
            await _notificationPublisher.PublishAsync(
                notifications.Select(NotificationDto.FromEntity).ToArray(),
                cancellationToken);
        }

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

    private async Task EnsureCounterPaymentRoleAsync(CancellationToken cancellationToken)
    {
        if (!_currentUserService.UserId.HasValue)
            throw new InvalidOperationException("Không xác định được người thực hiện thanh toán tại quầy.");

        var currentRole = await _context.Users
            .AsNoTracking()
            .Where(user => user.Id == _currentUserService.UserId.Value && user.IsActive)
            .Select(user => user.Role)
            .FirstOrDefaultAsync(cancellationToken);

        if (currentRole == null ||
            (!currentRole.Equals(SystemRoles.Admin, StringComparison.OrdinalIgnoreCase) &&
             !currentRole.Equals(SystemRoles.Cashier, StringComparison.OrdinalIgnoreCase)))
        {
            throw new InvalidOperationException(
                "Chỉ Admin hoặc Cashier đang hoạt động mới được ghi nhận thanh toán thủ công tại quầy.");
        }
    }

    private async Task EnsureManualPaymentIsSafeAsync(
        Guid orderId,
        CancellationToken cancellationToken)
    {
        var attempts = await _context.PaymentAttempts
            .Where(attempt =>
                attempt.OrderId == orderId &&
                (attempt.Status == PaymentAttempt.CreatingStatus ||
                 attempt.Status == PaymentAttempt.PendingStatus ||
                 attempt.Status == PaymentAttempt.PaidStatus ||
                 attempt.Status == PaymentAttempt.RequiresReviewStatus))
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

                throw new InvalidOperationException(
                    "Đơn hàng đang có phiên thanh toán online còn hiệu lực. Không được thu tiền thủ công trong lúc khách có thể vẫn đang chuyển khoản. Hãy để khách hoàn tất, hủy phiên online hoặc chờ phiên hết hạn trước khi thanh toán tại quầy.");
            }

            if (attempt.Status == PaymentAttempt.RequiresReviewStatus)
            {
                throw new InvalidOperationException(
                    "Đơn hàng có giao dịch online đang chờ đối soát. Không được thu thêm tiền cho đến khi giao dịch này được xử lý.");
            }

            if (attempt.Status == PaymentAttempt.PaidStatus)
            {
                throw new InvalidOperationException(
                    "Nhà cung cấp đã ghi nhận đơn hàng này thanh toán online. Không được tạo thêm thanh toán thủ công.");
            }
        }
    }
}
