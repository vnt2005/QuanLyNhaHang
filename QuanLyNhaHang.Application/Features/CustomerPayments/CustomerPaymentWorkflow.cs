using System.Globalization;
using System.Security.Cryptography;
using Microsoft.EntityFrameworkCore;
using QuanLyNhaHang.Application.Common.Interfaces;
using QuanLyNhaHang.Application.Common.Notifications;
using QuanLyNhaHang.Application.Common.Payments;
using QuanLyNhaHang.Application.Features.CustomerPayments.DTOs;
using QuanLyNhaHang.Application.Features.Notifications.DTOs;
using QuanLyNhaHang.Domain.Entities;

namespace QuanLyNhaHang.Application.Features.CustomerPayments;

public sealed class CustomerPaymentWorkflow
{
    private static readonly HashSet<string> PayableOrderStatuses = new(StringComparer.Ordinal)
    {
        "Confirmed",
        "Preparing",
        "Cooking",
        "Ready",
        "Served"
    };

    private static readonly TimeSpan PaymentRequestLifetime = TimeSpan.FromMinutes(15);
    private static readonly TimeSpan CreatingAttemptGracePeriod = TimeSpan.FromMinutes(1);

    private readonly IApplicationDbContext _context;
    private readonly ICurrentUserService _currentUserService;
    private readonly IAdminNotificationPublisher _notificationPublisher;
    private readonly IPaymentGateway _paymentGateway;

    public CustomerPaymentWorkflow(
        IApplicationDbContext context,
        ICurrentUserService currentUserService,
        IAdminNotificationPublisher notificationPublisher,
        IPaymentGateway paymentGateway)
    {
        _context = context;
        _currentUserService = currentUserService;
        _notificationPublisher = notificationPublisher;
        _paymentGateway = paymentGateway;
    }

    public async Task<CustomerPaymentResult<CustomerPaymentInstructionDto>> CreateAsync(
        Guid orderId,
        string? qrToken,
        CancellationToken cancellationToken)
    {
        if (!_paymentGateway.IsConfigured)
        {
            return CustomerPaymentResult<CustomerPaymentInstructionDto>.Unavailable(
                "Thanh toán SePay chưa được cấu hình đầy đủ trên máy chủ.");
        }

        var order = await GetAccessibleOrderAsync(
            orderId,
            qrToken,
            cancellationToken);

        if (order == null)
        {
            return CustomerPaymentResult<CustomerPaymentInstructionDto>.NotFound(
                "Không tìm thấy đơn hàng hợp lệ để thanh toán.");
        }

        var existingPayment = await _context.Payments
            .AsNoTracking()
            .FirstOrDefaultAsync(
                payment => payment.OrderId == order.Id && payment.Status == "Paid",
                cancellationToken);

        if (existingPayment != null)
        {
            return CustomerPaymentResult<CustomerPaymentInstructionDto>.Success(
                new CustomerPaymentInstructionDto
                {
                    AlreadyPaid = true,
                    PaymentCode = existingPayment.PaymentCode,
                    Amount = existingPayment.FinalAmount
                });
        }

        if (!CanStartOnlinePayment(order.Status))
        {
            return CustomerPaymentResult<CustomerPaymentInstructionDto>.Conflict(
                GetPaymentUnavailableMessage(order.Status),
                order.Status);
        }

        CustomerPaymentQuote quote;
        try
        {
            quote = await CalculateQuoteAsync(order, cancellationToken);
        }
        catch (InvalidOperationException exception)
        {
            return CustomerPaymentResult<CustomerPaymentInstructionDto>.Invalid(
                exception.Message);
        }

        var reconciliation = await ReconcileOpenAttemptsAsync(
            order,
            quote,
            cancellationToken);
        if (reconciliation != null)
            return reconciliation;

        var providerOrderCode = await CreateProviderOrderCodeAsync(cancellationToken);
        var expiresAt = DateTime.UtcNow.Add(PaymentRequestLifetime);
        var instruction = _paymentGateway.CreatePaymentInstruction(
            providerOrderCode,
            quote.FinalAmount);
        var attempt = new PaymentAttempt(
            order.Id,
            _paymentGateway.Provider,
            providerOrderCode,
            quote.FinalAmount,
            expiresAt);

        attempt.AttachPaymentRequest(
            instruction.PaymentCode,
            instruction.QrCodeUrl,
            "PENDING");

        await _context.PaymentAttempts.AddAsync(attempt, cancellationToken);
        await _context.SaveChangesAsync(cancellationToken);

        return CustomerPaymentResult<CustomerPaymentInstructionDto>.Success(
            BuildInstructionDto(
                order,
                attempt,
                instruction,
                quote,
                reused: false));
    }

    public async Task<CustomerPaymentResult<CancelPaymentAttemptDto>> CancelAsync(
        Guid orderId,
        Guid attemptId,
        string? qrToken,
        CancellationToken cancellationToken)
    {
        var attempt = await _context.PaymentAttempts
            .FirstOrDefaultAsync(
                item => item.Id == attemptId &&
                        item.OrderId == orderId &&
                        item.Provider == _paymentGateway.Provider,
                cancellationToken);

        if (attempt == null)
        {
            return CustomerPaymentResult<CancelPaymentAttemptDto>.NotFound(
                "Không tìm thấy phiên thanh toán.");
        }

        var order = await GetAccessibleOrderAsync(
            orderId,
            qrToken,
            cancellationToken,
            hasPaymentAttemptAccess: true);
        if (order == null)
        {
            return CustomerPaymentResult<CancelPaymentAttemptDto>.NotFound(
                "Không tìm thấy đơn hàng.");
        }

        if (attempt.Status == PaymentAttempt.PaidStatus)
        {
            return CustomerPaymentResult<CancelPaymentAttemptDto>.Conflict(
                "Giao dịch đã được thanh toán.");
        }

        if (attempt.Status == PaymentAttempt.RequiresReviewStatus)
        {
            return CustomerPaymentResult<CancelPaymentAttemptDto>.Success(
                new CancelPaymentAttemptDto
                {
                    AttemptStatus = attempt.Status,
                    RequiresReview = true
                });
        }

        if (attempt.Status == PaymentAttempt.CancelledStatus ||
            attempt.Status == PaymentAttempt.ExpiredStatus ||
            attempt.Status == PaymentAttempt.FailedStatus)
        {
            return CustomerPaymentResult<CancelPaymentAttemptDto>.Success(
                new CancelPaymentAttemptDto
                {
                    AttemptStatus = attempt.Status
                });
        }

        attempt.MarkCancelled(
            "Khách hàng hủy phiên thanh toán. QR chuyển khoản cũ không còn được tự động ghi nhận vào đơn.");
        await _context.SaveChangesAsync(cancellationToken);

        return CustomerPaymentResult<CancelPaymentAttemptDto>.Success(
            new CancelPaymentAttemptDto
            {
                AttemptStatus = attempt.Status
            });
    }

    public async Task<CustomerPaymentResult<CustomerPaymentStatusDto>> GetStatusAsync(
        Guid orderId,
        string? qrToken,
        Guid? attemptId,
        PaymentChannelState paymentChannel,
        CancellationToken cancellationToken)
    {
        var requestedAttempt = attemptId.HasValue
            ? await _context.PaymentAttempts
                .FirstOrDefaultAsync(
                    item => item.Id == attemptId.Value &&
                            item.OrderId == orderId &&
                            item.Provider == _paymentGateway.Provider,
                    cancellationToken)
            : null;

        var order = await GetAccessibleOrderAsync(
            orderId,
            qrToken,
            cancellationToken,
            hasPaymentAttemptAccess: requestedAttempt != null);
        if (order == null)
        {
            return CustomerPaymentResult<CustomerPaymentStatusDto>.NotFound(
                "Không tìm thấy đơn hàng.");
        }

        var payment = await _context.Payments
            .AsNoTracking()
            .Where(item => item.OrderId == order.Id && item.Status == "Paid")
            .OrderByDescending(item => item.PaidAt)
            .FirstOrDefaultAsync(cancellationToken);

        var latestAttempt = requestedAttempt ?? await _context.PaymentAttempts
            .Where(item => item.OrderId == order.Id &&
                           item.Provider == _paymentGateway.Provider)
            .OrderByDescending(item => item.CreatedAt)
            .FirstOrDefaultAsync(cancellationToken);

        var attemptChanged = false;
        if (latestAttempt != null &&
            (latestAttempt.Status == PaymentAttempt.CreatingStatus ||
             latestAttempt.Status == PaymentAttempt.PendingStatus) &&
            latestAttempt.ExpiresAt <= DateTime.UtcNow)
        {
            latestAttempt.MarkExpired();
            attemptChanged = true;
        }

        if (payment == null &&
            latestAttempt != null &&
            !CanStartOnlinePayment(order.Status) &&
            (latestAttempt.Status == PaymentAttempt.CreatingStatus ||
             latestAttempt.Status == PaymentAttempt.PendingStatus))
        {
            latestAttempt.MarkCancelled(
                $"Order status {order.Status} is not eligible for online payment.");
            attemptChanged = true;
        }

        if (attemptChanged)
            await _context.SaveChangesAsync(cancellationToken);

        var orderCanStartOnlinePayment = CanStartOnlinePayment(order.Status);
        var canPay = payment == null &&
                     orderCanStartOnlinePayment &&
                     paymentChannel.Ready;
        var paymentUnavailableReason = payment != null
            ? null
            : !orderCanStartOnlinePayment
                ? GetPaymentUnavailableMessage(order.Status)
                : !paymentChannel.Ready
                    ? GetWebhookUnavailableMessage()
                    : null;
        var instruction = BuildInstruction(
            latestAttempt,
            paymentChannel.Ready);

        return CustomerPaymentResult<CustomerPaymentStatusDto>.Success(
            new CustomerPaymentStatusDto
            {
                OrderId = order.Id,
                OrderCode = order.OrderCode,
                OrderStatus = order.Status,
                Paid = payment != null,
                CanPay = canPay,
                PaymentUnavailableReason = paymentUnavailableReason,
                PaymentCode = payment?.PaymentCode,
                Amount = payment?.FinalAmount ?? latestAttempt?.Amount,
                PaidAt = payment?.PaidAt,
                PaymentMethod = payment?.PaymentMethod,
                PaymentChannelReady = paymentChannel.Ready,
                PaymentChannelRequired = paymentChannel.Required,
                PaymentChannelLastConfirmedAt = paymentChannel.LastConfirmedAtUtc,
                AttemptId = latestAttempt?.Id,
                AttemptStatus = latestAttempt?.Status,
                RequiresReview = latestAttempt?.Status == PaymentAttempt.RequiresReviewStatus,
                ReviewReason = latestAttempt?.ReviewReason,
                ExpectedAmount = latestAttempt?.Amount,
                ReceivedAmount = latestAttempt?.ReceivedAmount,
                ExpiresAt = latestAttempt?.ExpiresAt,
                QrCode = instruction?.QrCodeUrl,
                TransferContent = instruction?.PaymentCode,
                BankCode = instruction?.BankCode,
                AccountNumber = instruction?.AccountNumber,
                AccountHolder = instruction?.AccountHolder
            });
    }

    public async Task ProcessWebhookAsync(
        IncomingPaymentTransaction transaction,
        CancellationToken cancellationToken)
    {
        var attempt = await _context.PaymentAttempts
            .FirstOrDefaultAsync(
                item => item.Provider == _paymentGateway.Provider &&
                        item.ProviderPaymentLinkId == transaction.PaymentCode,
                cancellationToken);

        if (attempt == null)
            return;

        if (attempt.Status == PaymentAttempt.PaidStatus ||
            attempt.Status == PaymentAttempt.RequiresReviewStatus)
        {
            return;
        }

        var transactionWasAfterExpiry =
            attempt.ExpiresAt < transaction.OccurredAtUtc;
        if (attempt.Status == PaymentAttempt.PendingStatus &&
            transactionWasAfterExpiry)
        {
            attempt.MarkExpired();
        }

        if (attempt.Status == PaymentAttempt.CancelledStatus ||
            (attempt.Status == PaymentAttempt.ExpiredStatus &&
             transactionWasAfterExpiry) ||
            attempt.Status == PaymentAttempt.FailedStatus ||
            attempt.Status == PaymentAttempt.CreatingStatus)
        {
            var reason = attempt.Status switch
            {
                PaymentAttempt.CancelledStatus => "PaidAfterPaymentCancellation",
                PaymentAttempt.ExpiredStatus => "PaidAfterPaymentExpiry",
                PaymentAttempt.FailedStatus => "PaidAfterPaymentAttemptFailure",
                _ => "PaymentWebhookBeforeAttemptActivated"
            };

            attempt.MarkRequiresReview(
                transaction.Amount,
                transaction.TransactionId,
                reason,
                "PAID");
            await _context.SaveChangesAsync(cancellationToken);
            return;
        }

        if (attempt.Amount != transaction.Amount)
        {
            attempt.MarkRequiresReview(
                transaction.Amount,
                transaction.TransactionId,
                "AmountMismatch",
                "PAID");
            await _context.SaveChangesAsync(cancellationToken);
            return;
        }

        var order = await _context.Orders
            .FirstOrDefaultAsync(
                item => item.Id == attempt.OrderId,
                cancellationToken);

        if (order == null)
        {
            attempt.MarkRequiresReview(
                transaction.Amount,
                transaction.TransactionId,
                "OrderMissing",
                "PAID");
            await _context.SaveChangesAsync(cancellationToken);
            return;
        }

        if (!order.IsActive || order.Status == "Cancelled")
        {
            attempt.MarkRequiresReview(
                transaction.Amount,
                transaction.TransactionId,
                "PaidAfterOrderCancellation",
                "PAID");
            await _context.SaveChangesAsync(cancellationToken);
            return;
        }

        var existingPayment = await _context.Payments
            .FirstOrDefaultAsync(
                payment => payment.OrderId == order.Id && payment.Status == "Paid",
                cancellationToken);

        if (existingPayment != null)
        {
            attempt.MarkRequiresReview(
                transaction.Amount,
                transaction.TransactionId,
                "DuplicatePaymentAfterOrderAlreadyPaid",
                "PAID");
            await _context.SaveChangesAsync(cancellationToken);
            return;
        }

        if (!CanStartOnlinePayment(order.Status))
        {
            attempt.MarkRequiresReview(
                transaction.Amount,
                transaction.TransactionId,
                order.Status == "Pending"
                    ? "PaidBeforeOrderConfirmation"
                    : $"PaidWhenOrderStatusNotPayable:{order.Status}",
                "PAID");
            await _context.SaveChangesAsync(cancellationToken);
            return;
        }

        CustomerPaymentQuote quote;
        try
        {
            quote = await CalculateQuoteAsync(order, cancellationToken);
        }
        catch (InvalidOperationException exception)
        {
            attempt.MarkRequiresReview(
                transaction.Amount,
                transaction.TransactionId,
                $"QuoteUnavailable: {exception.Message}",
                "PAID");
            await _context.SaveChangesAsync(cancellationToken);
            return;
        }

        if (quote.FinalAmount != attempt.Amount)
        {
            attempt.MarkRequiresReview(
                transaction.Amount,
                transaction.TransactionId,
                "OrderAmountChangedAfterPaymentRequestCreation",
                "PAID");
            await _context.SaveChangesAsync(cancellationToken);
            return;
        }

        var payment = new Payment(
            order.Id,
            quote.Subtotal,
            quote.DiscountAmount,
            quote.VatAmount,
            quote.FinalAmount,
            "BankTransfer",
            $"{_paymentGateway.Provider} | transactionId={transaction.TransactionId} | " +
            $"reference={transaction.BankReference} | gateway={transaction.Gateway} | " +
            $"attempt={attempt.Id}",
            quote.ServiceChargeAmount);

        await _context.Payments.AddAsync(payment, cancellationToken);
        attempt.MarkPaid(
            payment.Id,
            transaction.Amount,
            transaction.TransactionId,
            "PAID");

        var promotionUsage = await _context.PromotionUsages
            .FirstOrDefaultAsync(
                usage => usage.OrderId == order.Id && usage.Status == "Applied",
                cancellationToken);
        promotionUsage?.SetPayment(payment.Id);

        order.UpdateTotalAmount(quote.Subtotal);
        if (order.Status == "Served")
        {
            order.MarkCompleted();
            if (order.RestaurantTableId.HasValue)
            {
                var table = await _context.RestaurantTables.FirstOrDefaultAsync(
                    item => item.Id == order.RestaurantTableId.Value,
                    cancellationToken);
                table?.MarkAvailable();
            }
        }

        await PaidOrderInvoiceIssuer.IssueAsync(
            _context,
            order,
            payment,
            $"Phát hành tự động từ thanh toán chuyển khoản QR qua {_paymentGateway.Provider}",
            cancellationToken);

        var notifications = new List<Notification>();
        if (order.CustomerUserId.HasValue)
        {
            notifications.Add(new Notification(
                order.CustomerUserId.Value,
                "Payment.Paid",
                "Thanh toán thành công",
                $"Đơn {order.OrderCode} đã thanh toán " +
                $"{quote.FinalAmount.ToString("N0", CultureInfo.GetCultureInfo("vi-VN"))} đ qua {_paymentGateway.Provider}.",
                "success",
                "/orders",
                order.Id));
        }

        var adminUserIds = await _context.Users
            .AsNoTracking()
            .Where(user =>
                user.IsActive &&
                user.IsEmailVerified &&
                AdminNotificationAudience.OrderAndReservationRoles
                    .Contains(user.Role))
            .Select(user => user.Id)
            .ToListAsync(cancellationToken);

        notifications.AddRange(adminUserIds.Select(userId => new Notification(
            userId,
            "Payment.PaidFromCustomer",
            "Đã nhận chuyển khoản QR",
            $"Đơn {order.OrderCode} vừa thanh toán " +
            $"{quote.FinalAmount.ToString("N0", CultureInfo.GetCultureInfo("vi-VN"))} đ qua {_paymentGateway.Provider}.",
            "success",
            "Hóa đơn",
            order.Id)));

        if (notifications.Count > 0)
        {
            await _context.Notifications.AddRangeAsync(
                notifications,
                cancellationToken);
        }

        await _context.SaveChangesAsync(cancellationToken);
        await _notificationPublisher.PublishAsync(
            notifications.Select(NotificationDto.FromEntity).ToArray(),
            cancellationToken);
    }

    private async Task<CustomerPaymentResult<CustomerPaymentInstructionDto>?>
        ReconcileOpenAttemptsAsync(
            Order order,
            CustomerPaymentQuote quote,
            CancellationToken cancellationToken)
    {
        var now = DateTime.UtcNow;
        var attempts = await _context.PaymentAttempts
            .Where(item => item.OrderId == order.Id &&
                           item.Provider == _paymentGateway.Provider &&
                           (item.Status == PaymentAttempt.CreatingStatus ||
                            item.Status == PaymentAttempt.PendingStatus))
            .OrderByDescending(item => item.CreatedAt)
            .ToListAsync(cancellationToken);

        var changed = false;
        foreach (var attempt in attempts)
        {
            if (attempt.ExpiresAt <= now)
            {
                attempt.MarkExpired();
                changed = true;
                continue;
            }

            if (attempt.Status == PaymentAttempt.CreatingStatus)
            {
                if (attempt.CreatedAt > now.Subtract(CreatingAttemptGracePeriod))
                {
                    if (changed)
                        await _context.SaveChangesAsync(cancellationToken);

                    return CustomerPaymentResult<CustomerPaymentInstructionDto>.Conflict(
                        "Một phiên thanh toán đang được tạo. Vui lòng thử lại sau ít phút.",
                        attemptId: attempt.Id,
                        attemptStatus: attempt.Status);
                }

                attempt.MarkFailed(
                    "Payment instruction creation was interrupted.");
                changed = true;
                continue;
            }

            if (string.IsNullOrWhiteSpace(attempt.ProviderPaymentLinkId))
            {
                attempt.MarkFailed(
                    "Payment attempt is pending but has no transfer content.");
                changed = true;
                continue;
            }

            var instruction = _paymentGateway.CreatePaymentInstruction(
                attempt.ProviderOrderCode,
                checked((int)attempt.Amount));

            if (!string.Equals(
                    instruction.PaymentCode,
                    attempt.ProviderPaymentLinkId,
                    StringComparison.OrdinalIgnoreCase))
            {
                attempt.MarkCancelled(
                    "Payment prefix configuration changed; a new QR is required.");
                changed = true;
                continue;
            }

            if (attempt.Amount == quote.FinalAmount)
            {
                if (changed)
                    await _context.SaveChangesAsync(cancellationToken);

                return CustomerPaymentResult<CustomerPaymentInstructionDto>.Success(
                    BuildInstructionDto(
                        order,
                        attempt,
                        instruction,
                        quote,
                        reused: true));
            }

            attempt.MarkCancelled(
                "Payment QR was superseded because the order amount changed.");
            changed = true;
        }

        if (changed)
            await _context.SaveChangesAsync(cancellationToken);

        return null;
    }

    private PaymentInstruction? BuildInstruction(
        PaymentAttempt? attempt,
        bool paymentChannelReady)
    {
        if (attempt == null ||
            !paymentChannelReady ||
            !_paymentGateway.IsConfigured ||
            attempt.Status != PaymentAttempt.PendingStatus ||
            attempt.Amount <= 0 ||
            attempt.Amount > int.MaxValue ||
            string.IsNullOrWhiteSpace(attempt.ProviderPaymentLinkId))
        {
            return null;
        }

        var instruction = _paymentGateway.CreatePaymentInstruction(
            attempt.ProviderOrderCode,
            checked((int)attempt.Amount));

        return string.Equals(
            instruction.PaymentCode,
            attempt.ProviderPaymentLinkId,
            StringComparison.OrdinalIgnoreCase)
            ? instruction
            : null;
    }

    private async Task<Order?> GetAccessibleOrderAsync(
        Guid orderId,
        string? qrToken,
        CancellationToken cancellationToken,
        bool hasPaymentAttemptAccess = false)
    {
        var order = await _context.Orders
            .FirstOrDefaultAsync(
                item => item.Id == orderId && item.IsActive,
                cancellationToken);

        if (order == null)
            return null;

        if (hasPaymentAttemptAccess)
            return order;

        if (order.CustomerUserId.HasValue)
        {
            return _currentUserService.UserId == order.CustomerUserId.Value
                ? order
                : null;
        }

        if (order.OrderType == "Takeaway")
            return order;

        if (!order.RestaurantTableId.HasValue ||
            string.IsNullOrWhiteSpace(qrToken))
        {
            return null;
        }

        var validQr = await _context.TableQrCodes
            .AsNoTracking()
            .AnyAsync(
                code => code.RestaurantTableId == order.RestaurantTableId.Value &&
                        code.Token == qrToken &&
                        code.IsActive &&
                        code.Status == "Active",
                cancellationToken);

        return validQr ? order : null;
    }

    private async Task<CustomerPaymentQuote> CalculateQuoteAsync(
        Order order,
        CancellationToken cancellationToken)
    {
        var subtotal = decimal.Round(
            await _context.OrderItems
                .Where(item =>
                    item.OrderId == order.Id &&
                    item.Status != "Cancelled")
                .SumAsync(item => item.TotalPrice, cancellationToken),
            0,
            MidpointRounding.AwayFromZero);

        if (subtotal <= 0)
        {
            throw new InvalidOperationException(
                "Đơn hàng chưa có món hợp lệ để thanh toán.");
        }

        var promotionUsage = await _context.PromotionUsages
            .AsNoTracking()
            .FirstOrDefaultAsync(
                usage => usage.OrderId == order.Id &&
                         usage.Status == "Applied",
                cancellationToken);
        var discountAmount = decimal.Round(
            Math.Min(promotionUsage?.DiscountAmount ?? 0, subtotal),
            0,
            MidpointRounding.AwayFromZero);

        var settings = await _context.RestaurantSettings
            .AsNoTracking()
            .Where(item => item.IsActive)
            .OrderByDescending(item => item.UpdatedAt ?? item.CreatedAt)
            .FirstOrDefaultAsync(cancellationToken);

        var afterDiscount = subtotal - discountAmount;
        var serviceChargeAmount = order.OrderType == "DineIn"
            ? decimal.Round(
                afterDiscount *
                (settings?.ServiceChargePercent ?? 0) / 100m,
                0,
                MidpointRounding.AwayFromZero)
            : 0m;
        var vatAmount = decimal.Round(
            (afterDiscount + serviceChargeAmount) *
            (settings?.DefaultVatPercent ?? 0) / 100m,
            0,
            MidpointRounding.AwayFromZero);
        var final = afterDiscount + serviceChargeAmount + vatAmount;
        var finalAmount = checked((int)decimal.Round(
            final,
            0,
            MidpointRounding.AwayFromZero));

        if (finalAmount <= 0)
        {
            throw new InvalidOperationException(
                "Số tiền thanh toán phải lớn hơn 0.");
        }

        return new CustomerPaymentQuote(
            subtotal,
            discountAmount,
            serviceChargeAmount,
            vatAmount,
            finalAmount);
    }

    private async Task<long> CreateProviderOrderCodeAsync(
        CancellationToken cancellationToken)
    {
        for (var attempt = 0; attempt < 12; attempt++)
        {
            var code = RandomNumberGenerator.GetInt32(
                1_000_000,
                10_000_000);
            var exists = await _context.PaymentAttempts
                .AsNoTracking()
                .AnyAsync(
                    item => item.Provider == _paymentGateway.Provider &&
                            item.ProviderOrderCode == code,
                    cancellationToken);

            if (!exists)
                return code;
        }

        throw new InvalidOperationException(
            "Không tạo được mã giao dịch thanh toán duy nhất.");
    }

    private CustomerPaymentInstructionDto BuildInstructionDto(
        Order order,
        PaymentAttempt attempt,
        PaymentInstruction instruction,
        CustomerPaymentQuote quote,
        bool reused)
        => new()
        {
            AlreadyPaid = false,
            Reused = reused ? true : null,
            OrderId = order.Id,
            OrderCode = order.OrderCode,
            AttemptId = attempt.Id,
            AttemptStatus = attempt.Status,
            ExpiresAt = attempt.ExpiresAt,
            QrCode = instruction.QrCodeUrl,
            TransferContent = instruction.PaymentCode,
            BankCode = instruction.BankCode,
            AccountNumber = instruction.AccountNumber,
            AccountHolder = instruction.AccountHolder,
            Amount = quote.FinalAmount,
            Subtotal = quote.Subtotal,
            DiscountAmount = quote.DiscountAmount,
            ServiceChargeAmount = quote.ServiceChargeAmount,
            VatAmount = quote.VatAmount,
            PaymentMethod = _paymentGateway.Provider
        };

    public static string GetWebhookUnavailableMessage()
        => "Thanh toán chuyển khoản đang tạm khóa vì máy chủ chưa xác nhận được " +
           "kết nối webhook SePay. Vui lòng báo nhà hàng mở lại kênh thanh toán rồi thử lại.";

    private static bool CanStartOnlinePayment(string orderStatus)
        => PayableOrderStatuses.Contains(orderStatus);

    private static string GetPaymentUnavailableMessage(string orderStatus)
        => orderStatus switch
        {
            "Pending" =>
                "Đơn hàng đang chờ nhà hàng xác nhận. Vui lòng thanh toán sau khi nhà hàng bắt đầu chuẩn bị món.",
            "Cancelled" =>
                "Đơn hàng đã hủy, không thể thanh toán.",
            "Completed" =>
                "Đơn hàng đã hoàn tất, không thể tạo thêm giao dịch thanh toán.",
            _ =>
                "Trạng thái đơn hàng hiện không cho phép thanh toán online."
        };

    private sealed record CustomerPaymentQuote(
        decimal Subtotal,
        decimal DiscountAmount,
        decimal ServiceChargeAmount,
        decimal VatAmount,
        int FinalAmount);
}
