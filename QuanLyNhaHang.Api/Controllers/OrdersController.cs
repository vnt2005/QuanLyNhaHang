using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using QuanLyNhaHang.Application.Common.Constants;
using QuanLyNhaHang.Application.Features.Orders.Commands.AddOrderItem;
using QuanLyNhaHang.Application.Features.Orders.Commands.CancelOrderItem;
using QuanLyNhaHang.Application.Features.Orders.Commands.ChangeStatus;
using QuanLyNhaHang.Application.Features.Orders.Commands.Create;
using QuanLyNhaHang.Application.Features.Orders.Commands.Delete;
using QuanLyNhaHang.Application.Features.Orders.Commands.Update;
using QuanLyNhaHang.Application.Features.Orders.Commands.UpdateOrderItemQuantity;
using QuanLyNhaHang.Application.Features.Orders.Queries.GetById;
using QuanLyNhaHang.Application.Features.Orders.Queries.GetList;
using QuanLyNhaHang.Application.Features.Orders.Queries.GetWithPaginatedList;
using QuanLyNhaHang.Application.Features.RestaurantTables.Queries.GetSelectable;

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

    // GET: api/orders/selectable-tables
    [HttpGet("selectable-tables")]
    [ResponseCache(Location = ResponseCacheLocation.None, NoStore = true)]
    [HasPermission(PermissionCodes.OrdersView)]
    public async Task<IActionResult> GetSelectableTables(
        CancellationToken cancellationToken)
    {
        var result = await _mediator.Send(
            new GetSelectableRestaurantTablesQuery("Order"),
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

    // POST: api/orders
    [HttpPost]
    [EnableRateLimiting("OrderCreate")]
    [IdempotentRequest("admin-order-create")]
    [HasPermission(PermissionCodes.OrdersCreate)]
    public async Task<IActionResult> Create(
        [FromBody] CreateOrderCommand command,
        CancellationToken cancellationToken)
    {
        var id = await _mediator.Send(command, cancellationToken);

        return CreatedAtAction(
            nameof(GetById),
            new { id },
            new
            {
                Id = id,
                Message = "Tạo order thành công."
            });
    }

    // PUT: api/orders/{id}
    [HttpPut("{id:guid}")]
    [EnableRateLimiting("OrderItemMutation")]
    [AtomicRequest]
    [HasPermission(PermissionCodes.OrdersUpdate)]
    public async Task<IActionResult> Update(
        Guid id,
        [FromBody] UpdateOrderCommand command,
        CancellationToken cancellationToken)
    {
        if (id != command.Id)
        {
            return BadRequest(new
            {
                Message = "Id trên URL không khớp với Id trong body."
            });
        }

        var result = await _mediator.Send(command, cancellationToken);

        if (!result)
        {
            return BadRequest(new
            {
                Message = "Cập nhật order thất bại."
            });
        }

        return Ok(new
        {
            Message = "Cập nhật order thành công."
        });
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

    // PATCH: api/orders/{id}/status
    [HttpPatch("{id:guid}/status")]
    [EnableRateLimiting("OrderItemMutation")]
    [AtomicRequest]
    [HasPermission(PermissionCodes.OrdersUpdate)]
    public async Task<IActionResult> ChangeStatus(
        Guid id,
        [FromBody] ChangeOrderStatusCommand command,
        CancellationToken cancellationToken)
    {
        if (id != command.Id)
        {
            return BadRequest(new
            {
                Message = "Id trên URL không khớp với Id trong body."
            });
        }

        var result = await _mediator.Send(command, cancellationToken);

        if (!result)
        {
            return BadRequest(new
            {
                Message = "Cập nhật trạng thái order thất bại."
            });
        }

        return Ok(new
        {
            Message = "Cập nhật trạng thái order thành công."
        });
    }

    // POST: api/orders/{id}/items
    [HttpPost("{id:guid}/items")]
    [EnableRateLimiting("OrderItemMutation")]
    [IdempotentRequest("admin-order-item-create")]
    [HasPermission(PermissionCodes.OrdersUpdate)]
    public async Task<IActionResult> AddOrderItem(
        Guid id,
        [FromBody] AddOrderItemCommand command,
        CancellationToken cancellationToken)
    {
        if (id != command.OrderId)
        {
            return BadRequest(new
            {
                Message = "Id order trên URL không khớp với OrderId trong body."
            });
        }

        var result = await _mediator.Send(command, cancellationToken);

        if (!result)
        {
            return BadRequest(new
            {
                Message = "Thêm món vào order thất bại."
            });
        }

        return Ok(new
        {
            Message = "Thêm món vào order thành công."
        });
    }

    // PUT: api/orders/{id}/items/{orderItemId}
    [HttpPut("{id:guid}/items/{orderItemId:guid}")]
    [EnableRateLimiting("OrderItemMutation")]
    [AtomicRequest]
    [HasPermission(PermissionCodes.OrdersUpdate)]
    public async Task<IActionResult> UpdateOrderItemQuantity(
        Guid id,
        Guid orderItemId,
        [FromBody] UpdateOrderItemQuantityCommand command,
        CancellationToken cancellationToken)
    {
        if (id != command.OrderId)
        {
            return BadRequest(new
            {
                Message = "Id order trên URL không khớp với OrderId trong body."
            });
        }

        if (orderItemId != command.OrderItemId)
        {
            return BadRequest(new
            {
                Message = "Id món trên URL không khớp với OrderItemId trong body."
            });
        }

        var result = await _mediator.Send(command, cancellationToken);

        if (!result)
        {
            return BadRequest(new
            {
                Message = "Cập nhật số lượng món thất bại."
            });
        }

        return Ok(new
        {
            Message = "Cập nhật số lượng món thành công."
        });
    }

    // DELETE: api/orders/{id}/items/{orderItemId}
    [HttpDelete("{id:guid}/items/{orderItemId:guid}")]
    [EnableRateLimiting("OrderItemMutation")]
    [AtomicRequest]
    [HasPermission(PermissionCodes.OrdersUpdate)]
    public async Task<IActionResult> CancelOrderItem(
        Guid id,
        Guid orderItemId,
        CancellationToken cancellationToken)
    {
        var command = new CancelOrderItemCommand
        {
            OrderId = id,
            OrderItemId = orderItemId
        };

        var result = await _mediator.Send(command, cancellationToken);

        if (!result)
        {
            return BadRequest(new
            {
                Message = "Hủy món trong order thất bại."
            });
        }

        return Ok(new
        {
            Message = "Hủy món trong order thành công."
        });
    }
}
