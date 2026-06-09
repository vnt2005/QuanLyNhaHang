using MediatR;
using Microsoft.AspNetCore.Mvc;
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

    [HttpGet("{token}")]
    public async Task<IActionResult> GetTableByToken(string token)
    {
        var result = await _mediator.Send(new GetQrOrderTableByTokenQuery
        {
            Token = token
        });

        if (result == null)
            return NotFound(new
            {
                message = "Mã QR không hợp lệ."
            });

        if (!result.IsActive || result.QrStatus != "Active")
            return BadRequest(new
            {
                message = "Mã QR đã bị vô hiệu hóa."
            });

        return Ok(result);
    }

    [HttpGet("{token}/menu-items")]
    public async Task<IActionResult> GetMenuItems(string token)
    {
        var result = await _mediator.Send(new GetQrOrderMenuItemsQuery
        {
            Token = token
        });

        return Ok(result);
    }

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