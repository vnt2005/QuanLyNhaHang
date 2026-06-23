using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using QuanLyNhaHang.Application.Features.Kitchen.Commands.Update;
using QuanLyNhaHang.Application.Features.Kitchen.Queries.GetList;

namespace QuanLyNhaHang.Api.Controllers;

[ApiController]
[Route("api/kitchen")]
[Authorize(Roles = "Admin")]
public class KitchenController : ControllerBase
{
    private readonly IMediator _mediator;

    public KitchenController(IMediator mediator)
    {
        _mediator = mediator;
    }

    [HttpGet("orders")]
    public async Task<IActionResult> GetKitchenOrders()
    {
        var result = await _mediator.Send(new GetKitchenOrdersQuery());

        return Ok(result);
    }

    [HttpGet("history")]
    public async Task<IActionResult> GetKitchenHistory()
    {
        var result = await _mediator.Send(new GetKitchenHistoryQuery());

        return Ok(result);
    }

    [HttpPatch("order-items/{orderItemId:guid}/status")]
    public async Task<IActionResult> UpdateKitchenOrderItemStatus(
        Guid orderItemId,
        [FromBody] UpdateKitchenOrderItemStatusCommand command)
    {
        command.OrderItemId = orderItemId;

        var result = await _mediator.Send(command);

        return Ok(new
        {
            success = result,
            message = "Cập nhật trạng thái món trong bếp thành công."
        });
    }
}