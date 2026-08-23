using System.Globalization;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using QuanLyNhaHang.Api.Payments;
using QuanLyNhaHang.Application.Common.Payments;
using QuanLyNhaHang.Application.Features.CustomerPayments.Commands.CancelPaymentAttempt;
using QuanLyNhaHang.Application.Features.CustomerPayments.Commands.CreateOnlinePayment;
using QuanLyNhaHang.Application.Features.CustomerPayments.Commands.ProcessPaymentWebhook;
using QuanLyNhaHang.Application.Features.CustomerPayments.DTOs;
using QuanLyNhaHang.Application.Features.CustomerPayments.Queries.GetStatus;

namespace QuanLyNhaHang.Api.Controllers;

[ApiController]
[Route("api/customer-payments")]
public sealed class CustomerPaymentsController : ControllerBase
{
    private readonly ISender _sender;
    private readonly IPaymentGateway _paymentGateway;
    private readonly IPaymentWebhookAdapter _paymentWebhookAdapter;
    private readonly IPaymentChannelReadiness _paymentChannelReadiness;

    public CustomerPaymentsController(
        ISender sender,
        IPaymentGateway paymentGateway,
        IPaymentWebhookAdapter paymentWebhookAdapter,
        IPaymentChannelReadiness paymentChannelReadiness)
    {
        _sender = sender;
        _paymentGateway = paymentGateway;
        _paymentWebhookAdapter = paymentWebhookAdapter;
        _paymentChannelReadiness = paymentChannelReadiness;
    }

    [AllowAnonymous]
    [EnableRateLimiting("PaymentMutation")]
    [IdempotentRequest("customer-sepay-qr-create")]
    [HttpPost("orders/{orderId:guid}/sepay-qr")]
    public async Task<IActionResult> CreateSePayQr(
        Guid orderId,
        [FromBody] CreateCustomerPaymentRequest? request,
        CancellationToken cancellationToken)
    {
        var result = await _sender.Send(
            new CreateOnlinePaymentCommand(
                orderId,
                request?.QrToken),
            cancellationToken);

        return ToActionResult(result);
    }

    [AllowAnonymous]
    [EnableRateLimiting("PaymentMutation")]
    [IdempotentRequest("customer-payment-attempt-cancel")]
    [HttpPost("orders/{orderId:guid}/attempts/{attemptId:guid}/cancel")]
    public async Task<IActionResult> CancelPaymentAttempt(
        Guid orderId,
        Guid attemptId,
        [FromBody] CreateCustomerPaymentRequest? request,
        CancellationToken cancellationToken)
    {
        var result = await _sender.Send(
            new CancelPaymentAttemptCommand(
                orderId,
                attemptId,
                request?.QrToken),
            cancellationToken);

        return ToActionResult(result);
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
        var result = await _sender.Send(
            new GetPaymentStatusQuery(
                orderId,
                qrToken,
                attemptId),
            cancellationToken);

        return ToActionResult(result);
    }

    [AllowAnonymous]
    [EnableRateLimiting("PaymentWebhook")]
    [HttpPost("sepay/readiness")]
    public IActionResult ConfirmSePayWebhookReadiness()
    {
        if (!_paymentGateway.IsConfigured)
        {
            return StatusCode(StatusCodes.Status503ServiceUnavailable, new
            {
                success = false,
                message = "SePay chưa được cấu hình trên máy chủ."
            });
        }

        if (!_paymentWebhookAdapter.IsAuthorized(
                Request.Headers["Authorization"].ToString()))
        {
            return Unauthorized(new
            {
                success = false,
                message = "Heartbeat webhook SePay không có thông tin xác thực hợp lệ."
            });
        }

        if (string.IsNullOrWhiteSpace(Request.Headers["CF-Ray"].ToString()))
        {
            return BadRequest(new
            {
                success = false,
                message = "Heartbeat phải đi qua Cloudflare Tunnel công khai."
            });
        }

        var readiness = _paymentChannelReadiness.ConfirmExternalHeartbeat();
        return Ok(new
        {
            success = true,
            webhookReady = readiness.Ready,
            readiness.LastConfirmedAtUtc,
            readiness.ValidUntilUtc
        });
    }

    [AllowAnonymous]
    [EnableRateLimiting("PaymentWebhook")]
    [IdempotentRequest(
        "sepay-webhook",
        FallbackWindowSeconds = 120)]
    [HttpPost("sepay/webhook")]
    public async Task<IActionResult> SePayWebhook(
        [FromBody] SePayWebhookTransaction webhook,
        CancellationToken cancellationToken)
    {
        if (!_paymentGateway.IsConfigured)
        {
            return StatusCode(StatusCodes.Status503ServiceUnavailable, new
            {
                success = false,
                message = "SePay chưa được cấu hình trên máy chủ."
            });
        }

        if (!_paymentWebhookAdapter.IsAuthorized(
                Request.Headers["Authorization"].ToString()))
        {
            return Unauthorized(new
            {
                success = false,
                message = "Webhook SePay không có thông tin xác thực hợp lệ."
            });
        }

        _paymentChannelReadiness.ConfirmExternalHeartbeat();

        if (!string.Equals(
                webhook.TransferType,
                "in",
                StringComparison.OrdinalIgnoreCase))
        {
            return SePayAcknowledged();
        }

        if (!_paymentWebhookAdapter.IsExpectedAccount(webhook.AccountNumber))
            return SePayAcknowledged();

        if (webhook.Id <= 0 || webhook.TransferAmount <= 0)
        {
            return BadRequest(new
            {
                success = false,
                message = "Dữ liệu giao dịch SePay không hợp lệ."
            });
        }

        var paymentCode = _paymentWebhookAdapter.ExtractPaymentCode(
            webhook.Code,
            webhook.Content,
            webhook.Description);
        if (string.IsNullOrWhiteSpace(paymentCode))
            return SePayAcknowledged();

        var transactionOccurredAtUtc =
            _paymentWebhookAdapter.ParseTransactionUtc(webhook.TransactionDate) ??
            DateTime.UtcNow;
        var bankReference = string.IsNullOrWhiteSpace(webhook.ReferenceCode)
            ? "n/a"
            : webhook.ReferenceCode.Trim();
        var gateway = string.IsNullOrWhiteSpace(webhook.Gateway)
            ? _paymentWebhookAdapter.DefaultGateway
            : webhook.Gateway.Trim();

        await _sender.Send(
            new ProcessPaymentWebhookCommand(
                new IncomingPaymentTransaction(
                    paymentCode,
                    webhook.TransferAmount,
                    webhook.Id.ToString(CultureInfo.InvariantCulture),
                    transactionOccurredAtUtc,
                    bankReference,
                    gateway)),
            cancellationToken);

        return SePayAcknowledged();
    }

    private IActionResult SePayAcknowledged()
        => Ok(new { success = true });

    private IActionResult ToActionResult<T>(CustomerPaymentResult<T> result)
        => result.Outcome switch
        {
            CustomerPaymentOutcome.Success => Ok(result.Value),
            CustomerPaymentOutcome.NotFound =>
                NotFound(new { message = result.Message }),
            CustomerPaymentOutcome.Invalid =>
                BadRequest(new { message = result.Message }),
            CustomerPaymentOutcome.Unavailable =>
                MapUnavailable(result),
            CustomerPaymentOutcome.Conflict =>
                MapConflict(result),
            _ => StatusCode(
                StatusCodes.Status500InternalServerError,
                new { message = "Kết quả xử lý thanh toán không hợp lệ." })
        };

    private IActionResult MapUnavailable<T>(CustomerPaymentResult<T> result)
    {
        if (string.Equals(
                result.Code,
                "SEPAY_WEBHOOK_UNAVAILABLE",
                StringComparison.Ordinal))
        {
            return StatusCode(StatusCodes.Status503ServiceUnavailable, new
            {
                success = false,
                code = result.Code,
                message = result.Message,
                webhookReady = false,
                lastConfirmedAtUtc = result.LastConfirmedAtUtc
            });
        }

        return StatusCode(
            StatusCodes.Status503ServiceUnavailable,
            new { message = result.Message });
    }

    private IActionResult MapConflict<T>(CustomerPaymentResult<T> result)
    {
        if (!string.IsNullOrWhiteSpace(result.OrderStatus))
        {
            return Conflict(new
            {
                message = result.Message,
                orderStatus = result.OrderStatus
            });
        }

        if (result.AttemptId.HasValue)
        {
            return Conflict(new
            {
                message = result.Message,
                attemptId = result.AttemptId,
                attemptStatus = result.AttemptStatus
            });
        }

        return Conflict(new { message = result.Message });
    }

    public sealed class CreateCustomerPaymentRequest
    {
        public string? QrToken { get; set; }
    }
}
