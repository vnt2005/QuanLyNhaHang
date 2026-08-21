using System.Globalization;
using System.Security.Cryptography;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;
using QuanLyNhaHang.Api.Payments;
using QuanLyNhaHang.Application.Common.Interfaces;
using QuanLyNhaHang.Application.Features.Notifications.DTOs;
using QuanLyNhaHang.Domain.Entities;

namespace QuanLyNhaHang.Api.Controllers;

[ApiController]
[Route("api/customer-payments")]
public sealed class CustomerPaymentsController : ControllerBase
{
    private const string SePayProvider = "SePay";
    private static readonly TimeSpan PaymentRequestLifetime = TimeSpan.FromMinutes(15);
    private static readonly TimeSpan CreatingAttemptGracePeriod = TimeSpan.FromMinutes(1);

    private readonly IApplicationDbContext _context;
    private readonly ICurrentUserService _currentUserService;
    private readonly IAdminNotificationPublisher _notificationPublisher;
    private readonly SePayPaymentService _sePay;

    public CustomerPaymentsController(
        IApplicationDbContext context,
        ICurrentUserService currentUserService,
        IAdminNotificationPublisher notificationPublisher,
        IConfiguration configuration)
    {
        _context = context;
        _currentUserService = currentUserService;
        _notificationPublisher = notificationPublisher;
        _sePay = new SePayPaymentService(configuration);
    }

    [AllowAnonymous]
    [EnableRateLimiting("QrCreate")]
    [HttpPost("orders/{orderId:guid}/sepay-qr")]
    public async Task<IActionResult> CreateSePayQr(
        Guid orderId,
        [FromBody] CreateCustomerPaymentRequest? request,
        CancellationToken cancellationToken)
    {
        if (!_sePay.IsConfigured)
        {
            return StatusCode(StatusCodes.Status503ServiceUnavailable, new
            {
                message = "Thanh toán SePay chưa được cấu hình đầy đủ trên máy chủ."
            });
        }

        var order = await GetAccessibleOrderAsync(
            orderId,
            request?.QrToken,
            cancellationToken);

        if (order == null)
            return NotFound(new { message = "Không tìm thấy đơn hàng hợp lệ để thanh toán." });

        if (order.Status == "Cancelled")
            return BadRequest(new { message = "Đơn hàng đã hủy, không thể thanh toán." });

        var existingPayment = await _context.Payments
            .AsNoTracking()
            .FirstOrDefaultAsync(
                payment => payment.OrderId == order.Id && payment.Status == "Paid",
                cancellationToken);

        if (existingPayment != null)
        {
            return Ok(new
            {
                success = true,
                alreadyPaid = true,
                paymentCode = existingPayment.PaymentCode,
                amount = existingPayment.FinalAmount
            });
        }

        CustomerPaymentQuote quote;
        try
        {
            quote = await CalculateQuoteAsync(order, cancellationToken);
        }
        catch (InvalidOperationException exception)
        {
            return BadRequest(new { message = exception.Message });
        }

        var reconciliation = await ReconcileOpenAttemptsAsync(
            order,
            quote,
            cancellationToken);
        if (reconciliation != null)
            return reconciliation;

        var providerOrderCode = await CreateProviderOrderCodeAsync(cancellationToken);
        var expiresAt = DateTime.UtcNow.Add(PaymentRequestLifetime);
        var instruction = _sePay.CreatePaymentInstruction(providerOrderCode, quote.FinalAmount);
        var attempt = new PaymentAttempt(
            order.Id,
            SePayProvider,
            providerOrderCode,
            quote.FinalAmount,
            expiresAt);

        attempt.AttachPaymentRequest(
            instruction.PaymentCode,
            instruction.QrCodeUrl,
            "PENDING");

        await _context.PaymentAttempts.AddAsync(attempt, cancellationToken);
        await _context.SaveChangesAsync(cancellationToken);

        return Ok(new
        {
            success = true,
            alreadyPaid = false,
            orderId = order.Id,
            orderCode = order.OrderCode,
            attemptId = attempt.Id,
            attemptStatus = attempt.Status,
            expiresAt = attempt.ExpiresAt,
            qrCode = instruction.QrCodeUrl,
            transferContent = instruction.PaymentCode,
            bankCode = instruction.BankCode,
            accountNumber = instruction.AccountNumber,
            accountHolder = instruction.AccountHolder,
            amount = quote.FinalAmount,
            subtotal = quote.Subtotal,
            discountAmount = quote.DiscountAmount,
            serviceChargeAmount = quote.ServiceChargeAmount,
            vatAmount = quote.VatAmount,
            paymentMethod = SePayProvider
        });
    }

    [AllowAnonymous]
    [EnableRateLimiting("QrCreate")]
    [HttpPost("orders/{orderId:guid}/attempts/{attemptId:guid}/cancel")]
    public async Task<IActionResult> CancelPaymentAttempt(
        Guid orderId,
        Guid attemptId,
        [FromBody] CreateCustomerPaymentRequest? request,
        CancellationToken cancellationToken)
    {
        var attempt = await _context.PaymentAttempts
            .FirstOrDefaultAsync(
                item => item.Id == attemptId &&
                        item.OrderId == orderId &&
                        item.Provider == SePayProvider,
                cancellationToken);

        if (attempt == null)
            return NotFound(new { message = "Không tìm thấy phiên thanh toán." });

        var order = await GetAccessibleOrderAsync(
            orderId,
            request?.QrToken,
            cancellationToken,
            hasPaymentAttemptAccess: true);
        if (order == null)
            return NotFound(new { message = "Không tìm thấy đơn hàng." });

        if (attempt.Status == PaymentAttempt.PaidStatus)
            return Conflict(new { message = "Giao dịch đã được thanh toán." });

        if (attempt.Status == PaymentAttempt.RequiresReviewStatus)
        {
            return Ok(new
            {
                success = true,
                attemptStatus = attempt.Status,
                requiresReview = true
            });
        }

        if (attempt.Status == PaymentAttempt.CancelledStatus ||
            attempt.Status == PaymentAttempt.ExpiredStatus ||
            attempt.Status == PaymentAttempt.FailedStatus)
        {
            return Ok(new { success = true, attemptStatus = attempt.Status });
        }

        attempt.MarkCancelled(
            "Khách hàng hủy phiên thanh toán. QR chuyển khoản cũ không còn được tự động ghi nhận vào đơn.");
        await _context.SaveChangesAsync(cancellationToken);
        return Ok(new { success = true, attemptStatus = attempt.Status });
    }

    [AllowAnonymous]
    [EnableRateLimiting("QrBrowse")]
    [HttpGet("orders/{orderId:guid}/status")]
    public async Task<IActionResult> GetStatus(
        Guid orderId,
        [FromQuery] string? qrToken,
        [FromQuery] Guid? attemptId,
        CancellationToken cancellationToken)
    {
        var requestedAttempt = attemptId.HasValue
            ? await _context.PaymentAttempts
                .FirstOrDefaultAsync(
                    item => item.Id == attemptId.Value &&
                            item.OrderId == orderId &&
                            item.Provider == SePayProvider,
                    cancellationToken)
            : null;

        var order = await GetAccessibleOrderAsync(
            orderId,
            qrToken,
            cancellationToken,
            hasPaymentAttemptAccess: requestedAttempt != null);
        if (order == null)
            return NotFound(new { message = "Không tìm thấy đơn hàng." });

        var payment = await _context.Payments
            .AsNoTracking()
            .Where(item => item.OrderId == order.Id && item.Status == "Paid")
            .OrderByDescending(item => item.PaidAt)
            .FirstOrDefaultAsync(cancellationToken);

        var latestAttempt = requestedAttempt ?? await _context.PaymentAttempts
            .Where(item => item.OrderId == order.Id && item.Provider == SePayProvider)
            .OrderByDescending(item => item.CreatedAt)
            .FirstOrDefaultAsync(cancellationToken);

        if (latestAttempt != null &&
            (latestAttempt.Status == PaymentAttempt.CreatingStatus ||
             latestAttempt.Status == PaymentAttempt.PendingStatus) &&
            latestAttempt.ExpiresAt <= DateTime.UtcNow)
        {
            latestAttempt.MarkExpired();
            await _context.SaveChangesAsync(cancellationToken);
        }

        var instruction = BuildInstruction(latestAttempt);

        return Ok(new
        {
            orderId = order.Id,
            orderCode = order.OrderCode,
            orderStatus = order.Status,
            paid = payment != null,
            paymentCode = payment?.PaymentCode,
            amount = payment?.FinalAmount ?? latestAttempt?.Amount,
            paidAt = payment?.PaidAt,
            paymentMethod = payment?.PaymentMethod,
            attemptId = latestAttempt?.Id,
            attemptStatus = latestAttempt?.Status,
            requiresReview = latestAttempt?.Status == PaymentAttempt.RequiresReviewStatus,
            reviewReason = latestAttempt?.ReviewReason,
            expectedAmount = latestAttempt?.Amount,
            receivedAmount = latestAttempt?.ReceivedAmount,
            expiresAt = latestAttempt?.ExpiresAt,
            qrCode = instruction?.QrCodeUrl,
            transferContent = instruction?.PaymentCode,
            bankCode = instruction?.BankCode,
            accountNumber = instruction?.AccountNumber,
            accountHolder = instruction?.AccountHolder
        });
    }

    [AllowAnonymous]
    [HttpPost("sepay/webhook")]
    public async Task<IActionResult> SePayWebhook(
        [FromBody] SePayWebhookTransaction webhook,
        CancellationToken cancellationToken)
    {
        if (!_sePay.IsConfigured)
        {
            return StatusCode(StatusCodes.Status503ServiceUnavailable, new
            {
                success = false,
                message = "SePay chưa được cấu hình trên máy chủ."
            });
        }

        if (!_sePay.IsWebhookAuthorized(Request.Headers["Authorization"].ToString()))
        {
            return Unauthorized(new
            {
                success = false,
                message = "Webhook SePay không có thông tin xác thực hợp lệ."
            });
        }

        if (!string.Equals(webhook.TransferType, "in", StringComparison.OrdinalIgnoreCase))
            return SePayAcknowledged();

        if (!_sePay.IsExpectedAccount(webhook.AccountNumber))
            return SePayAcknowledged();

        if (webhook.Id <= 0 || webhook.TransferAmount <= 0)
            return BadRequest(new { success = false, message = "Dữ liệu giao dịch SePay không hợp lệ." });

        var paymentCode = _sePay.ExtractPaymentCode(webhook);
        if (string.IsNullOrWhiteSpace(paymentCode))
            return SePayAcknowledged();

        var attempt = await _context.PaymentAttempts
            .FirstOrDefaultAsync(
                item => item.Provider == SePayProvider &&
                        item.ProviderPaymentLinkId == paymentCode,
                cancellationToken);

        if (attempt == null)
            return SePayAcknowledged();

        if (attempt.Status == PaymentAttempt.PaidStatus ||
            attempt.Status == PaymentAttempt.RequiresReviewStatus)
        {
            return SePayAcknowledged();
        }

        var transactionOccurredAtUtc = _sePay.GetTransactionUtc(webhook.TransactionDate)
            ?? DateTime.UtcNow;
        var transactionWasAfterExpiry = attempt.ExpiresAt < transactionOccurredAtUtc;
        if (attempt.Status == PaymentAttempt.PendingStatus && transactionWasAfterExpiry)
        {
            attempt.MarkExpired();
        }

        var transactionId = webhook.Id.ToString(CultureInfo.InvariantCulture);

        if (attempt.Status == PaymentAttempt.CancelledStatus ||
            (attempt.Status == PaymentAttempt.ExpiredStatus && transactionWasAfterExpiry) ||
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
                webhook.TransferAmount,
                transactionId,
                reason,
                "PAID");
            await _context.SaveChangesAsync(cancellationToken);
            return SePayAcknowledged();
        }

        if (attempt.Amount != webhook.TransferAmount)
        {
            attempt.MarkRequiresReview(
                webhook.TransferAmount,
                transactionId,
                "AmountMismatch",
                "PAID");
            await _context.SaveChangesAsync(cancellationToken);
            return SePayAcknowledged();
        }

        var order = await _context.Orders
            .FirstOrDefaultAsync(item => item.Id == attempt.OrderId, cancellationToken);

        if (order == null)
        {
            attempt.MarkRequiresReview(
                webhook.TransferAmount,
                transactionId,
                "OrderMissing",
                "PAID");
            await _context.SaveChangesAsync(cancellationToken);
            return SePayAcknowledged();
        }

        if (!order.IsActive || order.Status == "Cancelled")
        {
            attempt.MarkRequiresReview(
                webhook.TransferAmount,
                transactionId,
                "PaidAfterOrderCancellation",
                "PAID");
            await _context.SaveChangesAsync(cancellationToken);
            return SePayAcknowledged();
        }

        var existingPayment = await _context.Payments
            .FirstOrDefaultAsync(
                payment => payment.OrderId == order.Id && payment.Status == "Paid",
                cancellationToken);

        if (existingPayment != null)
        {
            attempt.MarkRequiresReview(
                webhook.TransferAmount,
                transactionId,
                "DuplicatePaymentAfterOrderAlreadyPaid",
                "PAID");
            await _context.SaveChangesAsync(cancellationToken);
            return SePayAcknowledged();
        }

        CustomerPaymentQuote quote;
        try
        {
            quote = await CalculateQuoteAsync(order, cancellationToken);
        }
        catch (InvalidOperationException exception)
        {
            attempt.MarkRequiresReview(
                webhook.TransferAmount,
                transactionId,
                $"QuoteUnavailable: {exception.Message}",
                "PAID");
            await _context.SaveChangesAsync(cancellationToken);
            return SePayAcknowledged();
        }

        if (quote.FinalAmount != attempt.Amount)
        {
            attempt.MarkRequiresReview(
                webhook.TransferAmount,
                transactionId,
                "OrderAmountChangedAfterPaymentRequestCreation",
                "PAID");
            await _context.SaveChangesAsync(cancellationToken);
            return SePayAcknowledged();
        }

        var bankReference = string.IsNullOrWhiteSpace(webhook.ReferenceCode)
            ? "n/a"
            : webhook.ReferenceCode.Trim();
        var gateway = string.IsNullOrWhiteSpace(webhook.Gateway)
            ? _sePay.BankCode
            : webhook.Gateway.Trim();

        var payment = new Payment(
            order.Id,
            quote.Subtotal,
            quote.DiscountAmount,
            quote.VatAmount,
            quote.FinalAmount,
            "BankTransfer",
            $"SePay | transactionId={webhook.Id} | reference={bankReference} | gateway={gateway} | attempt={attempt.Id}",
            quote.ServiceChargeAmount);

        await _context.Payments.AddAsync(payment, cancellationToken);
        attempt.MarkPaid(
            payment.Id,
            webhook.TransferAmount,
            transactionId,
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

        Notification? customerNotification = null;
        if (order.CustomerUserId.HasValue)
        {
            customerNotification = new Notification(
                order.CustomerUserId.Value,
                "Payment.Paid",
                "Thanh toán thành công",
                $"Đơn {order.OrderCode} đã thanh toán " +
                $"{quote.FinalAmount.ToString("N0", CultureInfo.GetCultureInfo("vi-VN"))} đ qua SePay.",
                "success",
                "/orders",
                order.Id);
            await _context.Notifications.AddAsync(customerNotification, cancellationToken);
        }

        await _context.SaveChangesAsync(cancellationToken);
        if (customerNotification != null)
        {
            await _notificationPublisher.PublishAsync(
                [NotificationDto.FromEntity(customerNotification)],
                cancellationToken);
        }

        return SePayAcknowledged();
    }

    private IActionResult SePayAcknowledged()
        => Ok(new { success = true });

    private async Task<IActionResult?> ReconcileOpenAttemptsAsync(
        Order order,
        CustomerPaymentQuote quote,
        CancellationToken cancellationToken)
    {
        var now = DateTime.UtcNow;
        var attempts = await _context.PaymentAttempts
            .Where(item => item.OrderId == order.Id &&
                           item.Provider == SePayProvider &&
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

                    return Conflict(new
                    {
                        message = "Một phiên thanh toán đang được tạo. Vui lòng thử lại sau ít phút.",
                        attemptId = attempt.Id,
                        attemptStatus = attempt.Status
                    });
                }

                attempt.MarkFailed("Payment instruction creation was interrupted.");
                changed = true;
                continue;
            }

            if (string.IsNullOrWhiteSpace(attempt.ProviderPaymentLinkId))
            {
                attempt.MarkFailed("Payment attempt is pending but has no transfer content.");
                changed = true;
                continue;
            }

            var instruction = _sePay.CreatePaymentInstruction(
                attempt.ProviderOrderCode,
                checked((int)attempt.Amount));

            if (!string.Equals(
                    instruction.PaymentCode,
                    attempt.ProviderPaymentLinkId,
                    StringComparison.OrdinalIgnoreCase))
            {
                attempt.MarkCancelled("Payment prefix configuration changed; a new QR is required.");
                changed = true;
                continue;
            }

            if (attempt.Amount == quote.FinalAmount)
            {
                if (changed)
                    await _context.SaveChangesAsync(cancellationToken);

                return Ok(new
                {
                    success = true,
                    alreadyPaid = false,
                    reused = true,
                    orderId = order.Id,
                    orderCode = order.OrderCode,
                    attemptId = attempt.Id,
                    attemptStatus = attempt.Status,
                    expiresAt = attempt.ExpiresAt,
                    qrCode = instruction.QrCodeUrl,
                    transferContent = instruction.PaymentCode,
                    bankCode = instruction.BankCode,
                    accountNumber = instruction.AccountNumber,
                    accountHolder = instruction.AccountHolder,
                    amount = quote.FinalAmount,
                    subtotal = quote.Subtotal,
                    discountAmount = quote.DiscountAmount,
                    serviceChargeAmount = quote.ServiceChargeAmount,
                    vatAmount = quote.VatAmount,
                    paymentMethod = SePayProvider
                });
            }

            attempt.MarkCancelled(
                "Payment QR was superseded because the order amount changed.");
            changed = true;
        }

        if (changed)
            await _context.SaveChangesAsync(cancellationToken);

        return null;
    }

    private SePayPaymentInstruction? BuildInstruction(PaymentAttempt? attempt)
    {
        if (attempt == null ||
            !_sePay.IsConfigured ||
            attempt.Status != PaymentAttempt.PendingStatus ||
            attempt.Amount is <= 0 or > int.MaxValue ||
            string.IsNullOrWhiteSpace(attempt.ProviderPaymentLinkId))
        {
            return null;
        }

        var instruction = _sePay.CreatePaymentInstruction(
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
            .FirstOrDefaultAsync(item => item.Id == orderId && item.IsActive, cancellationToken);

        if (order == null)
            return null;

        if (hasPaymentAttemptAccess)
            return order;

        if (order.CustomerUserId.HasValue)
        {
            if (User.Identity?.IsAuthenticated != true ||
                _currentUserService.UserId != order.CustomerUserId.Value)
            {
                return null;
            }

            return order;
        }

        if (order.OrderType == "Takeaway")
            return order;

        if (!order.RestaurantTableId.HasValue || string.IsNullOrWhiteSpace(qrToken))
            return null;

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
                .Where(item => item.OrderId == order.Id && item.Status != "Cancelled")
                .SumAsync(item => item.TotalPrice, cancellationToken),
            0,
            MidpointRounding.AwayFromZero);

        if (subtotal <= 0)
            throw new InvalidOperationException("Đơn hàng chưa có món hợp lệ để thanh toán.");

        var promotionUsage = await _context.PromotionUsages
            .AsNoTracking()
            .FirstOrDefaultAsync(
                usage => usage.OrderId == order.Id && usage.Status == "Applied",
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
                afterDiscount * (settings?.ServiceChargePercent ?? 0) / 100m,
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
            throw new InvalidOperationException("Số tiền thanh toán phải lớn hơn 0.");

        return new CustomerPaymentQuote(
            subtotal,
            discountAmount,
            serviceChargeAmount,
            vatAmount,
            finalAmount);
    }

    private async Task<long> CreateProviderOrderCodeAsync(CancellationToken cancellationToken)
    {
        for (var attempt = 0; attempt < 12; attempt++)
        {
            var code = RandomNumberGenerator.GetInt32(1_000_000, 10_000_000);
            var exists = await _context.PaymentAttempts
                .AsNoTracking()
                .AnyAsync(
                    item => item.Provider == SePayProvider &&
                            item.ProviderOrderCode == code,
                    cancellationToken);

            if (!exists)
                return code;
        }

        throw new InvalidOperationException("Không tạo được mã giao dịch thanh toán duy nhất.");
    }

    public sealed class CreateCustomerPaymentRequest
    {
        public string? QrToken { get; set; }
    }

    private sealed record CustomerPaymentQuote(
        decimal Subtotal,
        decimal DiscountAmount,
        decimal ServiceChargeAmount,
        decimal VatAmount,
        int FinalAmount);
}
