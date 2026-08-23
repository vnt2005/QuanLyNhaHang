using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using QuanLyNhaHang.Application.Features.CustomerPayments.Commands.CancelPaymentAttempt;
using QuanLyNhaHang.Application.Features.CustomerPayments.Commands.CreateOnlinePayment;
using QuanLyNhaHang.Application.Features.CustomerPayments.DTOs;
using QuanLyNhaHang.Application.Features.CustomerPayments.Queries.GetStatus;

namespace QuanLyNhaHang.Api.Controllers;

[ApiController]
[Route("api/customer-payments")]
public sealed class CustomerPaymentsController : ControllerBase
{
    private readonly ISender _sender;

    public CustomerPaymentsController(ISender sender)
    {
        _sender = sender;
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
