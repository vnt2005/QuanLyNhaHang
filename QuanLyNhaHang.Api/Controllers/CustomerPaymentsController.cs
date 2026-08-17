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
    private readonly IApplicationDbContext _context;
    private readonly ICurrentUserService _currentUserService;
    private readonly IPayOsPaymentService _payOs;

    public CustomerPaymentsController(
        IApplicationDbContext context,
        ICurrentUserService currentUserService,
        IPayOsPaymentService payOs)
    {
        _context = context;
        _currentUserService = currentUserService;
        _payOs = payOs;
    }

    [AllowAnonymous]
    [EnableRateLimiting("CustomerPayment")]
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

        var quote = await CalculateQuoteAsync(order, cancellationToken);
        var payOsOrderCode = CreatePayOsOrderCode(order.OrderCode);
        var description = $"DH{payOsOrderCode % 10_000_000:D7}";
        var encodedOrderId = Uri.EscapeDataString(order.Id.ToString());
        var returnUrl = $"{_payOs.CustomerWebBaseUrl}/payment-result?result=success&orderId={encodedOrderId}";
        var cancelUrl = $"{_payOs.CustomerWebBaseUrl}/payment-result?result=cancel&orderId={encodedOrderId}";

        var paymentLink = await _payOs.CreatePaymentLinkAsync(
            payOsOrderCode,
            quote.FinalAmount,
            description,
            returnUrl,
            cancelUrl,
            cancellationToken);

        return Ok(new
        {
            success = true,
            alreadyPaid = false,
            orderId = order.Id,
            orderCode = order.OrderCode,
            checkoutUrl = paymentLink.CheckoutUrl,
            qrCode = paymentLink.QrCode,
            amount = quote.FinalAmount,
            subtotal = quote.Subtotal,
            discountAmount = quote.DiscountAmount,
            serviceChargeAmount = quote.ServiceChargeAmount,
            vatAmount = quote.VatAmount,
            paymentMethod = "payOS"
        });
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

        return Ok(new
        {
            orderId = order.Id,
            orderCode = order.OrderCode,
            orderStatus = order.Status,
            paid = payment != null,
            paymentCode = payment?.PaymentCode,
            amount = payment?.FinalAmount,
            paidAt = payment?.PaidAt,
            paymentMethod = payment?.PaymentMethod
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

        // payOS also sends a signed sample payload while a webhook URL is being
        // configured. A valid but non-success event is acknowledged and ignored.
        if (!webhook.Success || webhook.Code != "00")
            return Ok(new { success = true });

        var orderSuffix = GetOrderSuffixFromPayOsCode(webhook.OrderCode);
        var orders = await _context.Orders
            .Where(order => order.OrderCode.EndsWith(orderSuffix))
            .Take(2)
            .ToListAsync(cancellationToken);

        if (orders.Count != 1)
            return BadRequest(new { message = "Không đối chiếu được đơn hàng từ webhook payOS." });

        var order = orders[0];
        if (order.Status == "Cancelled")
            return BadRequest(new { message = "Đơn hàng đã bị hủy." });

        var alreadyPaid = await _context.Payments
            .AnyAsync(
                payment => payment.OrderId == order.Id && payment.Status == "Paid",
                cancellationToken);

        if (alreadyPaid)
            return Ok(new { success = true });

        var quote = await CalculateQuoteAsync(order, cancellationToken);
        if (quote.FinalAmount != webhook.Amount)
        {
            return BadRequest(new
            {
                message = "Số tiền webhook không khớp số tiền phải thanh toán."
            });
        }

        var payment = new Payment(
            order.Id,
            quote.Subtotal,
            quote.DiscountAmount,
            quote.VatAmount,
            quote.FinalAmount,
            "BankTransfer",
            $"payOS | ref={webhook.Reference} | link={webhook.PaymentLinkId}",
            quote.ServiceChargeAmount);

        await _context.Payments.AddAsync(payment, cancellationToken);

        var promotionUsage = await _context.PromotionUsages
            .FirstOrDefaultAsync(
                usage => usage.OrderId == order.Id && usage.Status == "Applied",
                cancellationToken);
        promotionUsage?.SetPayment(payment.Id);

        await _context.SaveChangesAsync(cancellationToken);

        return Ok(new { success = true });
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

    private static long CreatePayOsOrderCode(string orderCode)
    {
        var digits = new string(orderCode.Where(char.IsDigit).ToArray());
        if (digits.Length < 14)
            throw new InvalidOperationException("Mã đơn hàng không phù hợp để thanh toán online.");

        // Last 14 digits are yMMddHHmmssfff for the current ORD timestamp format.
        // The final digit is a payment attempt discriminator. Dividing by 10 in
        // the webhook restores the suffix needed to find the original order.
        var suffix = digits[^14..];
        var baseCode = long.Parse(suffix);
        var attempt = DateTime.UtcNow.Millisecond % 9 + 1;
        return checked(baseCode * 10 + attempt);
    }

    private static string GetOrderSuffixFromPayOsCode(long payOsOrderCode)
        => (payOsOrderCode / 10).ToString("D14");

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
