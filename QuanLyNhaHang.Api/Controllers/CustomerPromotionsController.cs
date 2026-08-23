using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using QuanLyNhaHang.Application.Features.CustomerPromotions;

namespace QuanLyNhaHang.Api.Controllers;

[ApiController]
[Route("api/customer-promotions")]
public sealed class CustomerPromotionsController : ControllerBase
{
    private readonly ISender _sender;

    public CustomerPromotionsController(ISender sender)
    {
        _sender = sender;
    }

    [AllowAnonymous]
    [EnableRateLimiting("QrBrowse")]
    [HttpGet("orders/{orderId:guid}/applied")]
    public async Task<IActionResult> GetApplied(
        Guid orderId,
        [FromQuery] string? qrToken,
        CancellationToken cancellationToken)
    {
        try
        {
            var result = await _sender.Send(
                new GetAppliedCustomerPromotionQuery(orderId, qrToken),
                cancellationToken);

            return Ok(new
            {
                success = true,
                data = result
            });
        }
        catch (KeyNotFoundException exception)
        {
            return NotFound(new { message = exception.Message });
        }
    }

    [AllowAnonymous]
    [EnableRateLimiting("PaymentMutation")]
    [IdempotentRequest("customer-promotion-apply")]
    [HttpPost("orders/{orderId:guid}/apply")]
    public async Task<IActionResult> Apply(
        Guid orderId,
        [FromBody] ApplyCustomerPromotionRequest request,
        CancellationToken cancellationToken)
    {
        try
        {
            var result = await _sender.Send(
                new ApplyCustomerPromotionCommand(
                    orderId,
                    request.PromotionCode,
                    request.QrToken),
                cancellationToken);

            return Ok(new
            {
                success = true,
                message = "Áp dụng mã khuyến mãi thành công.",
                data = result
            });
        }
        catch (KeyNotFoundException exception)
        {
            return NotFound(new { message = exception.Message });
        }
        catch (ArgumentException exception)
        {
            return BadRequest(new { message = exception.Message });
        }
        catch (InvalidOperationException exception)
        {
            return BadRequest(new { message = exception.Message });
        }
    }

    public sealed class ApplyCustomerPromotionRequest
    {
        public string PromotionCode { get; set; } = string.Empty;
        public string? QrToken { get; set; }
    }
}
