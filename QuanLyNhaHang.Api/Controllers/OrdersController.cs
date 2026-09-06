using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using QuanLyNhaHang.Application.Common.Constants;
using QuanLyNhaHang.Application.Features.Orders.Commands.Delete;
using QuanLyNhaHang.Application.Features.Orders.Queries.GetById;
using QuanLyNhaHang.Application.Features.Orders.Queries.GetList;
using QuanLyNhaHang.Application.Features.Orders.Queries.GetWithPaginatedList;

namespace QuanLyNhaHang.Api.Controllers;

[Route("api/[controller]")]
[ApiController]
[Authorize]
[AtomicRequest]
public class OrdersController : ControllerBase
{
    private readonly IMediator _mediator;

    public OrdersController(IMediator mediator)
    {
        _mediator = mediator;
    }

    // Admin orders are read/delete only. Customer order creation is handled by
    // CustomerOrdersController so removing mutations here does not affect CustomerWeb.

    // GET: api/orders
    [HttpGet]
    [HasPermission(PermissionCodes.OrdersView)]
    public async Task<IActionResult> GetList(CancellationToken cancellationToken)
    {
        var result = await _mediator.Send(
            new GetOrderListQuery(),
            cancellationToken);

        return Ok(result);
    }

    // GET: api/orders/paginated?keyword=ORD&restaurantTableId=&status=Pending&isActive=true&pageNumber=1&pageSize=10
    [HttpGet("paginated")]
    [HasPermission(PermissionCodes.OrdersView)]
    public async Task<IActionResult> GetWithPaginatedList(
        [FromQuery] string? keyword,
        [FromQuery] Guid? restaurantTableId,
        [FromQuery] string? status,
        [FromQuery] bool? isActive,
        [FromQuery] bool? onlyUnpaid,
        [FromQuery] int pageNumber = 1,
        [FromQuery] int pageSize = 10,
        CancellationToken cancellationToken = default)
    {
        var query = new GetOrdersWithPaginatedListQuery
        {
            Keyword = keyword,
            RestaurantTableId = restaurantTableId,
            Status = status,
            IsActive = isActive,
            OnlyUnpaid = onlyUnpaid,
            PageNumber = pageNumber,
            PageSize = pageSize
        };

        var result = await _mediator.Send(query, cancellationToken);

        return Ok(result);
    }

    // GET: api/orders/{id}
    [HttpGet("{id:guid}")]
    [HasPermission(PermissionCodes.OrdersView)]
    public async Task<IActionResult> GetById(
        Guid id,
        CancellationToken cancellationToken)
    {
        var result = await _mediator.Send(
            new GetOrderByIdQuery(id),
            cancellationToken);

        if (result == null)
        {
            return NotFound(new
            {
                Message = "Không tìm thấy order."
            });
        }

        return Ok(result);
    }

    // DELETE: api/orders/{id}
    [HttpDelete("{id:guid}")]
    [EnableRateLimiting("OrderItemMutation")]
    [AtomicRequest]
    [HasPermission(PermissionCodes.OrdersDelete)]
    public async Task<IActionResult> Delete(
        Guid id,
        CancellationToken cancellationToken)
    {
        var result = await _mediator.Send(
            new DeleteOrderCommand(id),
            cancellationToken);

        if (!result)
        {
            return BadRequest(new
            {
                Message = "Xóa order thất bại."
            });
        }

        return Ok(new
        {
            Message = "Xóa order thành công."
        });
    }
}
