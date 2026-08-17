using System.Text.Json;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using Microsoft.EntityFrameworkCore;
using QuanLyNhaHang.Api.Payments;
using QuanLyNhaHang.Application.Common.Interfaces;
using QuanLyNhaHang.Domain.Entities;

namespace QuanLyNhaHang.Api.Controllers;

[ApiController]
[Route("api/customer-payments")]
public sealed class CustomerPaymentsController : ControllerBase
{
    private const string PayOsProvider = "payOS";
    private static readonly TimeSpan PaymentLinkLifetime = TimeSpan.FromMinutes(15);
    private static readonly TimeSpan CreatingAttemptGracePeriod = TimeSpan.FromMinutes(1);

    private readonly IApplicationDbContext _context;
    private readonly ICurrentUserService _currentUserService;
    private readonly PayOsPaymentService _payOs;

    public CustomerPaymentsController(
        IApplicationDbContext context,
        ICurrentUserService currentUserService,
        IConfiguration configuration)
    {
        _context = context;
        _currentUserService = currentUserService;
        _payOs = new PayOsPaymentService(configuration);
    }

    [AllowAnonymous]
    [EnableRateLimiting("QrCreate")]
    [HttpPost("orders/{orderId:guid}/payos-link")]
    public async Task<IActionResult> CreatePayOsLink(
        Guid orderId,
        [FromBody] CreateCustomerPaymentRequest? request,
        CancellationToken cancellationToken)
    {
        if (!_payOs.IsConfigured)
        {
            return StatusCode(StatusCodes.Status503ServiceUnavailable, new
            {
                message = "Thanh toán online chưa được cấu hình trên máy chủ."
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

        var payOsOrderCode = await CreateProviderOrderCodeAsync(cancellationToken);
        var expiresAt = DateTime.UtcNow.Add(PaymentLinkLifetime);
        var attempt = new PaymentAttempt(
            order.Id,
            PayOsProvider,
            payOsOrderCode,
            quote.FinalAmount,
            expiresAt);

        await _context.PaymentAttempts.AddAsync(attempt, cancellationToken);
        await _context.SaveChangesAsync(cancellationToken);

        var description = $"DH{payOsOrderCode % 10_000_000:D7}";
        var encodedOrderId = Uri.EscapeDataString(order.Id.ToString());
        var encodedAttemptId = Uri.EscapeDataString(attempt.Id.ToString());
        var returnUrl =
            $"{_payOs.CustomerWebBaseUrl}/payment-result?result=success&orderId={encodedOrderId}&attemptId={encodedAttemptId}";
        var cancelUrl =
            $"{_payOs.CustomerWebBaseUrl}/payment-result?result=cancel&orderId={encodedOrderId}&attemptId={encodedAttemptId}";

        PayOsPaymentLink paymentLink;
        try
        {
            paymentLink = await _payOs.CreatePaymentLinkAsync(
                payOsOrderCode,
                quote.FinalAmount,
                description,
                returnUrl,
                cancelUrl,
                expiresAt,
                cancellationToken);
        }
        catch (Exception exception) when (exception is InvalidOperationException or HttpRequestException or TaskCanceledException)
        {
            attempt.MarkFailed($"Không tạo được payment link: {exception.Message}");
            await _context.SaveChangesAsync(cancellationToken);
            return StatusCode(StatusCodes.Status502BadGateway, new
            {
                message = "Không kết nối được cổng thanh toán. Vui lòng thử lại."
            });
        }

        if (paymentLink.OrderCode != payOsOrderCode || paymentLink.Amount != quote.FinalAmount)
        {
            attempt.MarkFailed("payOS trả về mã giao dịch hoặc số tiền không khớp yêu cầu.");
            await _context.SaveChangesAsync(cancellationToken);
            return StatusCode(StatusCodes.Status502BadGateway, new
            {
                message = "Cổng thanh toán trả về dữ liệu không khớp đơn hàng."
            });
        }

        attempt.AttachPaymentLink(
            paymentLink.PaymentLinkId,
            paymentLink.CheckoutUrl,
            paymentLink.Status);
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
            checkoutUrl = paymentLink.CheckoutUrl,
            qrCode = paymentLink.QrCode,
            amount = quote.FinalAmount,
            subtotal = quote.Subtotal,
            discountAmount = quote.DiscountAmount,
            serviceChargeAmount = quote.ServiceChargeAmount,
            vatAmount = quote.VatAmount,
            paymentMethod = PayOsProvider
        });
    }

    [AllowAnonymous]
    [EnableRateLimiting("QrCreate")]
    [HttpPost("orders/{orderId:guid}/attempts/{attemptId:guid}/cancel")]
    public async Task<IActionResult> CancelPayOsAttempt(
        Guid orderId,
        Guid attemptId,
        [FromBody] CreateCustomerPaymentRequest? request,
        CancellationToken cancellationToken)
    {
        if (!_payOs.IsConfigured)
        {
            return StatusCode(StatusCodes.Status503ServiceUnavailable, new
            {
                message = "Thanh toán online chưa được cấu hình trên máy chủ."
            });
        }

        var order = await GetAccessibleOrderAsync(orderId, request?.QrToken, cancellationToken);
        if (order == null)
            return NotFound(new { message = "Không tìm thấy đơn hàng." });

        var attempt = await _context.PaymentAttempts
            .FirstOrDefaultAsync(
                item => item.Id == attemptId &&
                        item.OrderId == order.Id &&
                        item.Provider == PayOsProvider,
                cancellationToken);

        if (attempt == null)
            return NotFound(new { message = "Không tìm thấy phiên thanh toán." });

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

        if (attempt.Status is PaymentAttempt.CancelledStatus or
            PaymentAttempt.ExpiredStatus or PaymentAttempt.FailedStatus)
        {
            return Ok(new { success = true, attemptStatus = attempt.Status });
        }

        if (!string.IsNullOrWhiteSpace(attempt.ProviderPaymentLinkId))
        {
            PayOsPaymentLinkStatus providerStatus;
            try
            {
                providerStatus = await _payOs.GetPaymentLinkStatusAsync(
                    attempt.ProviderPaymentLinkId,
                    cancellationToken);
            }
            catch (Exception exception) when (exception is InvalidOperationException or HttpRequestException or TaskCanceledException)
            {
                return StatusCode(StatusCodes.Status502BadGateway, new
                {
                    message = "Không kiểm tra được trạng thái thanh toán với payOS. Vui lòng thử lại."
                });
            }

            switch (providerStatus.Status.ToUpperInvariant())
            {
                case "PAID":
                    return Conflict(new
                    {
                        message = "payOS đã ghi nhận giao dịch. Hệ thống đang chờ webhook xác nhận."
                    });
                case "EXPIRED":
                    attempt.MarkExpired();
                    await _context.SaveChangesAsync(cancellationToken);
                    return Ok(new { success = true, attemptStatus = attempt.Status });
                case "CANCELLED":
                    attempt.MarkCancelled("Khách hàng đã hủy thanh toán trên payOS.");
                    await _context.SaveChangesAsync(cancellationToken);
                    return Ok(new { success = true, attemptStatus = attempt.Status });
                case "PENDING":
                    try
                    {
                        await _payOs.CancelPaymentLinkAsync(
                            attempt.ProviderPaymentLinkId,
                            "Customer cancelled payment",
                            cancellationToken);
                    }
                    catch (Exception exception) when (exception is InvalidOperationException or HttpRequestException or TaskCanceledException)
                    {
                        return StatusCode(StatusCodes.Status502BadGateway, new
                        {
                            message = "Không hủy được payment link trên payOS. Vui lòng thử lại."
                        });
                    }
                    break;
                default:
                    return StatusCode(StatusCodes.Status502BadGateway, new
                    {
                        message = $"Trạng thái payment link payOS chưa xác định: {providerStatus.Status}."
                    });
            }
        }

        attempt.MarkCancelled("Khách hàng hủy thanh toán.");
        await _context.SaveChangesAsync(cancellationToken);
        return Ok(new { success = true, attemptStatus = attempt.Status });
    }

    [AllowAnonymous]
    [EnableRateLimiting("QrBrowse")]
    [HttpGet("orders/{orderId:guid}/status")]
    public async Task<IActionResult> GetStatus(
        Guid orderId,
        [FromQuery] string? qrToken,
        CancellationToken cancellationToken)
    {
        var order = await GetAccessibleOrderAsync(orderId, qrToken, cancellationToken);
        if (order == null)
            return NotFound(new { message = "Không tìm thấy đơn hàng." });

        var payment = await _context.Payments
            .AsNoTracking()
            .Where(item => item.OrderId == order.Id && item.Status == "Paid")
            .OrderByDescending(item => item.PaidAt)
            .FirstOrDefaultAsync(cancellationToken);

        var latestAttempt = await _context.PaymentAttempts
            .Where(item => item.OrderId == order.Id && item.Provider == PayOsProvider)
            .OrderByDescending(item => item.CreatedAt)
            .FirstOrDefaultAsync(cancellationToken);

        if (latestAttempt != null &&
            latestAttempt.Status is PaymentAttempt.CreatingStatus or PaymentAttempt.PendingStatus &&
            latestAttempt.ExpiresAt <= DateTime.UtcNow)
        {
            latestAttempt.MarkExpired();
            await _context.SaveChangesAsync(cancellationToken);
        }

        return Ok(new
        {
            orderId = order.Id,
            orderCode = order.OrderCode,
            orderStatus = order.Status,
            paid = payment != null,
            paymentCode = payment?.PaymentCode,
            amount = payment?.FinalAmount,
            paidAt = payment?.PaidAt,
            paymentMethod = payment?.PaymentMethod,
            attemptId = latestAttempt?.Id,
            attemptStatus = latestAttempt?.Status,
            requiresReview = latestAttempt?.Status == PaymentAttempt.RequiresReviewStatus,
            reviewReason = latestAttempt?.ReviewReason,
            expectedAmount = latestAttempt?.Amount,
            receivedAmount = latestAttempt?.ReceivedAmount,
            expiresAt = latestAttempt?.ExpiresAt
        });
    }

    [AllowAnonymous]
    [HttpPost("payos/webhook")]
    public async Task<IActionResult> PayOsWebhook(
        [FromBody] JsonElement payload,
        CancellationToken cancellationToken)
    {
        PayOsWebhookPayment webhook;
        try
        {
            webhook = _payOs.VerifyWebhook(payload);
        }
        catch (InvalidOperationException exception)
        {
            return BadRequest(new { message = exception.Message });
        }

        if (!webhook.Success || webhook.Code != "00")
            return Ok(new { success = true });

        var attempt = await _context.PaymentAttempts
            .FirstOrDefaultAsync(
                item => item.Provider == PayOsProvider &&
                        item.ProviderOrderCode == webhook.OrderCode,
                cancellationToken);

        // payOS sends a signed sample transaction while a webhook URL is being
        // confirmed. It intentionally has no matching local payment attempt.
        if (attempt == null)
            return Ok(new { success = true, ignored = true });

        if (attempt.Status is PaymentAttempt.PaidStatus or PaymentAttempt.RequiresReviewStatus)
            return Ok(new { success = true });

        if (!string.IsNullOrWhiteSpace(attempt.ProviderPaymentLinkId) &&
            !string.Equals(
                attempt.ProviderPaymentLinkId,
                webhook.PaymentLinkId,
                StringComparison.Ordinal))
        {
            attempt.MarkRequiresReview(
                webhook.Amount,
                webhook.Reference,
                "ProviderPaymentLinkIdMismatch");
            await _context.SaveChangesAsync(cancellationToken);
            return Ok(new { success = true, requiresReview = true });
        }

        if (attempt.Amount != webhook.Amount)
        {
            attempt.MarkRequiresReview(
                webhook.Amount,
                webhook.Reference,
                "AmountMismatch");
            await _context.SaveChangesAsync(cancellationToken);
            return Ok(new { success = true, requiresReview = true });
        }

        var order = await _context.Orders
            .FirstOrDefaultAsync(item => item.Id == attempt.OrderId, cancellationToken);

        if (order == null)
        {
            attempt.MarkRequiresReview(
                webhook.Amount,
                webhook.Reference,
                "OrderMissing");
            await _context.SaveChangesAsync(cancellationToken);
            return Ok(new { success = true, requiresReview = true });
        }

        if (!order.IsActive || order.Status == "Cancelled")
        {
            attempt.MarkRequiresReview(
                webhook.Amount,
                webhook.Reference,
                "PaidAfterOrderCancellation");
            await _context.SaveChangesAsync(cancellationToken);
            return Ok(new { success = true, requiresReview = true });
        }

        var existingPayment = await _context.Payments
            .FirstOrDefaultAsync(
                payment => payment.OrderId == order.Id && payment.Status == "Paid",
                cancellationToken);

        if (existingPayment != null)
        {
            attempt.MarkRequiresReview(
                webhook.Amount,
                webhook.Reference,
                "DuplicatePaymentAfterOrderAlreadyPaid");
            await _context.SaveChangesAsync(cancellationToken);
            return Ok(new { success = true, requiresReview = true });
        }

        CustomerPaymentQuote quote;
        try
        {
            quote = await CalculateQuoteAsync(order, cancellationToken);
        }
        catch (InvalidOperationException exception)
        {
            attempt.MarkRequiresReview(
                webhook.Amount,
                webhook.Reference,
                $"QuoteUnavailable: {exception.Message}");
            await _context.SaveChangesAsync(cancellationToken);
            return Ok(new { success = true, requiresReview = true });
        }

        if (quote.FinalAmount != attempt.Amount)
        {
            attempt.MarkRequiresReview(
                webhook.Amount,
                webhook.Reference,
                "OrderAmountChangedAfterPaymentLinkCreation");
            await _context.SaveChangesAsync(cancellationToken);
            return Ok(new { success = true, requiresReview = true });
        }

        var payment = new Payment(
            order.Id,
            quote.Subtotal,
            quote.DiscountAmount,
            quote.VatAmount,
            quote.FinalAmount,
            "BankTransfer",
            $"payOS | ref={webhook.Reference} | link={webhook.PaymentLinkId} | attempt={attempt.Id}",
            quote.ServiceChargeAmount);

        await _context.Payments.AddAsync(payment, cancellationToken);
        attempt.MarkPaid(
            payment.Id,
            webhook.Amount,
            webhook.Reference,
            "PAID");

        var promotionUsage = await _context.PromotionUsages
            .FirstOrDefaultAsync(
                usage => usage.OrderId == order.Id && usage.Status == "Applied",
                cancellationToken);
        promotionUsage?.SetPayment(payment.Id);

        await _context.SaveChangesAsync(cancellationToken);
        return Ok(new { success = true });
    }

    private async Task<IActionResult?> ReconcileOpenAttemptsAsync(
        Order order,
        CustomerPaymentQuote quote,
        CancellationToken cancellationToken)
    {
        var now = DateTime.UtcNow;
        var attempts = await _context.PaymentAttempts
            .Where(item => item.OrderId == order.Id &&
                           item.Provider == PayOsProvider &&
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

                attempt.MarkFailed("Payment link creation was interrupted before receiving a provider link.");
                changed = true;
                continue;
            }

            if (string.IsNullOrWhiteSpace(attempt.ProviderPaymentLinkId))
            {
                attempt.MarkFailed("Payment attempt is pending but has no provider payment link id.");
                changed = true;
                continue;
            }

            PayOsPaymentLinkStatus providerStatus;
            try
            {
                providerStatus = await _payOs.GetPaymentLinkStatusAsync(
                    attempt.ProviderPaymentLinkId,
                    cancellationToken);
            }
            catch (Exception exception) when (exception is InvalidOperationException or HttpRequestException or TaskCanceledException)
            {
                if (changed)
                    await _context.SaveChangesAsync(cancellationToken);

                return StatusCode(StatusCodes.Status502BadGateway, new
                {
                    message = "Không đối chiếu được payment link cũ với payOS. Vui lòng thử lại."
                });
            }

            var normalizedStatus = providerStatus.Status.ToUpperInvariant();
            if (normalizedStatus == "PAID")
            {
                if (changed)
                    await _context.SaveChangesAsync(cancellationToken);

                return Conflict(new
                {
                    message = "payOS đã ghi nhận giao dịch trước đó. Hệ thống đang chờ webhook xác nhận.",
                    attemptId = attempt.Id,
                    attemptStatus = "AwaitingWebhook"
                });
            }

            if (normalizedStatus == "CANCELLED")
            {
                attempt.MarkCancelled("payOS reports payment link as CANCELLED.");
                changed = true;
                continue;
            }

            if (normalizedStatus == "EXPIRED")
            {
                attempt.MarkExpired();
                changed = true;
                continue;
            }

            if (normalizedStatus != "PENDING")
            {
                if (changed)
                    await _context.SaveChangesAsync(cancellationToken);

                return StatusCode(StatusCodes.Status502BadGateway, new
                {
                    message = $"Trạng thái payment link payOS chưa xác định: {providerStatus.Status}."
                });
            }

            if (providerStatus.Amount != attempt.Amount)
            {
                attempt.MarkFailed("Provider amount differs from the persisted payment attempt amount.");
                changed = true;
                continue;
            }

            if (attempt.Amount == quote.FinalAmount &&
                !string.IsNullOrWhiteSpace(attempt.CheckoutUrl))
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
                    checkoutUrl = attempt.CheckoutUrl,
                    amount = quote.FinalAmount,
                    subtotal = quote.Subtotal,
                    discountAmount = quote.DiscountAmount,
                    serviceChargeAmount = quote.ServiceChargeAmount,
                    vatAmount = quote.VatAmount,
                    paymentMethod = PayOsProvider
                });
            }

            try
            {
                await _payOs.CancelPaymentLinkAsync(
                    attempt.ProviderPaymentLinkId,
                    "Order amount changed",
                    cancellationToken);
            }
            catch (Exception exception) when (exception is InvalidOperationException or HttpRequestException or TaskCanceledException)
            {
                if (changed)
                    await _context.SaveChangesAsync(cancellationToken);

                return StatusCode(StatusCodes.Status502BadGateway, new
                {
                    message = "Tổng tiền đơn đã thay đổi nhưng chưa hủy được payment link cũ. Vui lòng thử lại."
                });
            }

            attempt.MarkCancelled("Payment link was superseded because the order amount changed.");
            changed = true;
        }

        if (changed)
            await _context.SaveChangesAsync(cancellationToken);

        return null;
    }

    private async Task<Order?> GetAccessibleOrderAsync(
        Guid orderId,
        string? qrToken,
        CancellationToken cancellationToken)
    {
        var order = await _context.Orders
            .FirstOrDefaultAsync(item => item.Id == orderId && item.IsActive, cancellationToken);

        if (order == null)
            return null;

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
        for (var attempt = 0; attempt < 8; attempt++)
        {
            var code = checked(
                DateTimeOffset.UtcNow.ToUnixTimeMilliseconds() * 1000L +
                Random.Shared.Next(100, 1000));

            var exists = await _context.PaymentAttempts
                .AsNoTracking()
                .AnyAsync(
                    item => item.Provider == PayOsProvider &&
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