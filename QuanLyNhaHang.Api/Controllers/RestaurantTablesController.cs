using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using QuanLyNhaHang.Application.Common.Constants;
using QuanLyNhaHang.Application.Features.RestaurantTables.Commands.ChangeStatus;
using QuanLyNhaHang.Application.Features.RestaurantTables.Commands.Create;
using QuanLyNhaHang.Application.Features.RestaurantTables.Commands.Delete;
using QuanLyNhaHang.Application.Features.RestaurantTables.Commands.Update;
using QuanLyNhaHang.Application.Features.RestaurantTables.Queries.GetById;
using QuanLyNhaHang.Application.Features.RestaurantTables.Queries.GetList;
using QuanLyNhaHang.Application.Features.RestaurantTables.Queries.GetSelectable;
using QuanLyNhaHang.Application.Features.RestaurantTables.Queries.GetWithPaginatedList;

namespace QuanLyNhaHang.Api.Controllers;

[Route("api/[controller]")]
[ApiController]
[Authorize]
public class RestaurantTablesController : ControllerBase
{
    private readonly IMediator _mediator;

    public RestaurantTablesController(IMediator mediator)
    {
        _mediator = mediator;
    }

    // GET: api/restauranttables
    [HttpGet]
    [HasPermission(PermissionCodes.TablesView)]
    public async Task<IActionResult> GetList(CancellationToken cancellationToken)
    {
        var result = await _mediator.Send(
            new GetRestaurantTableListQuery(),
            cancellationToken);

        return Ok(result);
    }

    // GET: api/restauranttables/selectable?purpose=Reservation|Order|QrCode
    [HttpGet("selectable")]
    [ResponseCache(Location = ResponseCacheLocation.None, NoStore = true)]
    [HasPermission(PermissionCodes.TablesView)]
    public async Task<IActionResult> GetSelectable(
        [FromQuery] string? purpose,
        CancellationToken cancellationToken)
    {
        var result = await _mediator.Send(
            new GetSelectableRestaurantTablesQuery(purpose),
            cancellationToken);

        return Ok(result);
    }

    // GET: api/restauranttables/paginated?keyword=ban&areaId=&status=Available&pageNumber=1&pageSize=10
    [HttpGet("paginated")]
    [HasPermission(PermissionCodes.TablesView)]
    public async Task<IActionResult> GetWithPaginatedList(
        [FromQuery] string? keyword,
        [FromQuery] Guid? areaId,
        [FromQuery] string? status,
        [FromQuery] int pageNumber = 1,
        [FromQuery] int pageSize = 10,
        CancellationToken cancellationToken = default)
    {
        var query = new GetRestaurantTablesWithPaginatedListQuery
        {
            Keyword = keyword,
            AreaId = areaId,
            Status = status,
            PageNumber = pageNumber,
            PageSize = pageSize
        };

        var result = await _mediator.Send(query, cancellationToken);

        return Ok(result);
    }

    // GET: api/restauranttables/{id}
    [HttpGet("{id:guid}")]
    [HasPermission(PermissionCodes.TablesView)]
    public async Task<IActionResult> GetById(
        Guid id,
        CancellationToken cancellationToken)
    {
        var result = await _mediator.Send(
            new GetRestaurantTableByIdQuery(id),
            cancellationToken);

        if (result == null)
        {
            return NotFound(new
            {
                Message = "Không tìm thấy bàn."
            });
        }

        return Ok(result);
    }

    // POST: api/restauranttables
    [HttpPost]
    [HasPermission(PermissionCodes.TablesManage)]
    public async Task<IActionResult> Create(
        [FromBody] CreateRestaurantTableCommand command,
        CancellationToken cancellationToken)
    {
        var id = await _mediator.Send(command, cancellationToken);

        return CreatedAtAction(
            nameof(GetById),
            new { id },
            new
            {
                Id = id,
                Message = "Tạo bàn thành công."
            });
    }

    // PUT: api/restauranttables/{id}
    [HttpPut("{id:guid}")]
    [HasPermission(PermissionCodes.TablesManage)]
    public async Task<IActionResult> Update(
        Guid id,
        [FromBody] UpdateRestaurantTableCommand command,
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
                Message = "Cập nhật bàn thất bại."
            });
        }

        return Ok(new
        {
            Message = "Cập nhật bàn thành công."
        });
    }

    // PATCH: api/restauranttables/{id}/status
    [HttpPatch("{id:guid}/status")]
    [HasPermission(PermissionCodes.TablesUpdateStatus)]
    public async Task<IActionResult> ChangeStatus(
        Guid id,
        [FromBody] ChangeRestaurantTableStatusCommand command,
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
                Message = "Cập nhật trạng thái bàn thất bại."
            });
        }

        return Ok(new
        {
            Message = "Cập nhật trạng thái bàn thành công."
        });
    }

    // DELETE: api/restauranttables/{id}
    [HttpDelete("{id:guid}")]
    [HasPermission(PermissionCodes.TablesManage)]
    public async Task<IActionResult> Delete(
        Guid id,
        CancellationToken cancellationToken)
    {
        var result = await _mediator.Send(
            new DeleteRestaurantTableCommand(id),
            cancellationToken);

        if (!result)
        {
            return BadRequest(new
            {
                Message = "Xóa bàn thất bại."
            });
        }

        return Ok(new
        {
            Message = "Xóa bàn thành công."
        });
    }
}