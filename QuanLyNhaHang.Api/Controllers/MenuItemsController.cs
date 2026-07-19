using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using QuanLyNhaHang.Application.Common.Constants;
using QuanLyNhaHang.Application.Features.MenuItems.Commands.ChangeAvailability;
using QuanLyNhaHang.Application.Features.MenuItems.Commands.Create;
using QuanLyNhaHang.Application.Features.MenuItems.Commands.Delete;
using QuanLyNhaHang.Application.Features.MenuItems.Commands.Update;
using QuanLyNhaHang.Application.Features.MenuItems.Queries.GetById;
using QuanLyNhaHang.Application.Features.MenuItems.Queries.GetList;
using QuanLyNhaHang.Application.Features.MenuItems.Queries.GetWithPaginatedList;

namespace QuanLyNhaHang.Api.Controllers;

[Route("api/[controller]")]
[ApiController]
[Authorize]
public class MenuItemsController : ControllerBase
{
    private readonly IMediator _mediator;

    public MenuItemsController(IMediator mediator)
    {
        _mediator = mediator;
    }

    // GET: api/menuitems
    [HttpGet]
    [HasPermission(PermissionCodes.MenuView)]
    public async Task<IActionResult> GetList(CancellationToken cancellationToken)
    {
        var result = await _mediator.Send(
            new GetMenuItemListQuery(),
            cancellationToken);

        return Ok(result);
    }

    // GET: api/menuitems/paginated?keyword=tra&menuCategoryId=&isAvailable=true&isActive=true&pageNumber=1&pageSize=10
    [HttpGet("paginated")]
    [HasPermission(PermissionCodes.MenuView)]
    public async Task<IActionResult> GetWithPaginatedList(
        [FromQuery] string? keyword,
        [FromQuery] Guid? menuCategoryId,
        [FromQuery] bool? isAvailable,
        [FromQuery] bool? isActive,
        [FromQuery] int pageNumber = 1,
        [FromQuery] int pageSize = 10,
        CancellationToken cancellationToken = default)
    {
        var query = new GetMenuItemsWithPaginatedListQuery
        {
            Keyword = keyword,
            MenuCategoryId = menuCategoryId,
            IsAvailable = isAvailable,
            IsActive = isActive,
            PageNumber = pageNumber,
            PageSize = pageSize
        };

        var result = await _mediator.Send(query, cancellationToken);

        return Ok(result);
    }

    // GET: api/menuitems/{id}
    [HttpGet("{id:guid}")]
    [HasPermission(PermissionCodes.MenuView)]
    public async Task<IActionResult> GetById(
        Guid id,
        CancellationToken cancellationToken)
    {
        var result = await _mediator.Send(
            new GetMenuItemByIdQuery(id),
            cancellationToken);

        if (result == null)
        {
            return NotFound(new
            {
                Message = "Không tìm thấy món ăn."
            });
        }

        return Ok(result);
    }

    // POST: api/menuitems
    [HttpPost]
    [HasPermission(PermissionCodes.MenuManage)]
    public async Task<IActionResult> Create(
        [FromBody] CreateMenuItemCommand command,
        CancellationToken cancellationToken)
    {
        var id = await _mediator.Send(command, cancellationToken);

        return CreatedAtAction(
            nameof(GetById),
            new { id },
            new
            {
                Id = id,
                Message = "Tạo món ăn thành công."
            });
    }

    // PUT: api/menuitems/{id}
    [HttpPut("{id:guid}")]
    [HasPermission(PermissionCodes.MenuManage)]
    public async Task<IActionResult> Update(
        Guid id,
        [FromBody] UpdateMenuItemCommand command,
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
                Message = "Cập nhật món ăn thất bại."
            });
        }

        return Ok(new
        {
            Message = "Cập nhật món ăn thành công."
        });
    }

    // PATCH: api/menuitems/{id}/availability
    [HttpPatch("{id:guid}/availability")]
    [HasPermission(PermissionCodes.MenuUpdateAvailability)]
    public async Task<IActionResult> ChangeAvailability(
        Guid id,
        [FromBody] ChangeMenuItemAvailabilityCommand command,
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
                Message = "Cập nhật trạng thái món ăn thất bại."
            });
        }

        return Ok(new
        {
            Message = "Cập nhật trạng thái món ăn thành công."
        });
    }

    // DELETE: api/menuitems/{id}
    [HttpDelete("{id:guid}")]
    [HasPermission(PermissionCodes.MenuManage)]
    public async Task<IActionResult> Delete(
        Guid id,
        CancellationToken cancellationToken)
    {
        var result = await _mediator.Send(
            new DeleteMenuItemCommand(id),
            cancellationToken);

        if (!result)
        {
            return BadRequest(new
            {
                Message = "Xóa món ăn thất bại."
            });
        }

        return Ok(new
        {
            Message = "Xóa món ăn thành công."
        });
    }
}