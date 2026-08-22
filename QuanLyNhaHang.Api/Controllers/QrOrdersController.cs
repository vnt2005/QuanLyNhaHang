using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using QuanLyNhaHang.Application.Features.QrOrders.Commands.Create;
using QuanLyNhaHang.Application.Features.QrOrders.Queries.GetById;
using QuanLyNhaHang.Application.Features.QrOrders.Queries.GetList;

namespace QuanLyNhaHang.Api.Controllers;

[ApiController]
[Route("api/qr-order")]
public class QrOrdersController : ControllerBase
{
    private readonly IMediator _mediator;

    public QrOrdersController(IMediator mediator)
    {
        _mediator = mediator;
    }

    [AllowAnonymous]
    [EnableRateLimiting("QrBrowse")]
    [HttpGet("{token}")]
    public async Task<IActionResult> GetTableByToken(string token)
    {
        var result = await _mediator.Send(
            new GetQrOrderTableByTokenQuery
            {
                Token = token
            });

        if (result == null)
        {
            return NotFound(new
            {
                message = "Mã QR không hợp lệ."
            });
        }

        if (!result.IsActive || result.QrStatus != "Active")
        {
            return BadRequest(new
            {
                message = "Mã QR đã bị vô hiệu hóa."
            });
        }

        return Ok(result);
    }

    [AllowAnonymous]
    [EnableRateLimiting("QrBrowse")]
    [HttpGet("{token}/menu-items")]
    public async Task<IActionResult> GetMenuItems(string token)
    {
        var result = await _mediator.Send(
            new GetQrOrderMenuItemsQuery
            {
                Token = token
            });

        return Ok(result);
    }

    [AllowAnonymous]
    [EnableRateLimiting("QrBrowse")]
    [HttpGet("{token}/orders/{orderId:guid}")]
    public async Task<IActionResult> GetOrder(
        string token,
        Guid orderId)
    {
        var result = await _mediator.Send(
            new GetQrOrderByIdQuery
            {
                Token = token,
                OrderId = orderId
            });

        if (result == null)
        {
            return NotFound(new
            {
                message = "Không tìm thấy đơn của bàn này."
            });
        }

        return Ok(result);
    }

    [AllowAnonymous]
    [EnableRateLimiting("OrderCreate")]
    [IdempotentRequest("qr-order-create")]
    [HttpPost("{token}/orders")]
    public async Task<IActionResult> CreateOrder(
        string token,
        [FromBody] CreateQrOrderCommand command)
    {
        command.Token = token;

        var result = await _mediator.Send(command);

        return Ok(new
        {
            success = true,
            message = "Gọi món bằng QR thành công. Món đã được gửi xuống bếp.",
            data = result
        });
    }
}
