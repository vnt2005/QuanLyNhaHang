using System.Globalization;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using QuanLyNhaHang.Api.Contracts.Payments;
using QuanLyNhaHang.Application.Common.Payments;
using QuanLyNhaHang.Application.Features.CustomerPayments.Commands.ProcessPaymentWebhook;
using QuanLyNhaHang.Application.Features.CustomerPayments.DTOs;

namespace QuanLyNhaHang.Api.Controllers;

[ApiController]
[Route("api/customer-payments/sepay")]
public sealed class SePayWebhookController : ControllerBase
{
    private readonly ISender _sender;
    private readonly IPaymentGateway _paymentGateway;
    private readonly IPaymentWebhookAdapter _paymentWebhookAdapter;
    private readonly IPaymentChannelReadiness _paymentChannelReadiness;

    public SePayWebhookController(
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
    [EnableRateLimiting("PaymentWebhook")]
    [HttpPost("readiness")]
    public IActionResult ConfirmReadiness()
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
    [HttpPost("webhook")]
    public async Task<IActionResult> Webhook(
        [FromBody] SePayWebhookRequest webhook,
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
            return Acknowledged();
        }

        if (!_paymentWebhookAdapter.IsExpectedAccount(webhook.AccountNumber))
            return Acknowledged();

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
            return Acknowledged();

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

        return Acknowledged();
    }

    private IActionResult Acknowledged()
        => Ok(new { success = true });
}
