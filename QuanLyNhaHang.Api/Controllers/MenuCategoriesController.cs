using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using QuanLyNhaHang.Application.Common.Constants;
using QuanLyNhaHang.Application.Features.MenuCategories.Commands.Create;
using QuanLyNhaHang.Application.Features.MenuCategories.Commands.Delete;
using QuanLyNhaHang.Application.Features.MenuCategories.Commands.Update;
using QuanLyNhaHang.Application.Features.MenuCategories.Queries.GetById;
using QuanLyNhaHang.Application.Features.MenuCategories.Queries.GetList;
using QuanLyNhaHang.Application.Features.MenuCategories.Queries.GetWithPaginatedList;

namespace QuanLyNhaHang.Api.Controllers;

[Route("api/[controller]")]
[ApiController]
[Authorize]
public class MenuCategoriesController : ControllerBase
{
    private readonly IMediator _mediator;

    public MenuCategoriesController(IMediator mediator)
    {
        _mediator = mediator;
    }

    // GET: api/menucategories
    [HttpGet]
    [HasPermission(PermissionCodes.MenuView)]
    public async Task<IActionResult> GetList(CancellationToken cancellationToken)
    {
        var result = await _mediator.Send(
            new GetMenuCategoryListQuery(),
            cancellationToken);

        return Ok(result);
    }

    // GET: api/menucategories/paginated?keyword=nuoc&isActive=true&pageNumber=1&pageSize=10
    [HttpGet("paginated")]
    [HasPermission(PermissionCodes.MenuView)]
    public async Task<IActionResult> GetWithPaginatedList(
        [FromQuery] string? keyword,
        [FromQuery] bool? isActive,
        [FromQuery] int pageNumber = 1,
        [FromQuery] int pageSize = 10,
        CancellationToken cancellationToken = default)
    {
        var query = new GetMenuCategoriesWithPaginatedListQuery
        {
            Keyword = keyword,
            IsActive = isActive,
            PageNumber = pageNumber,
            PageSize = pageSize
        };

        var result = await _mediator.Send(query, cancellationToken);

        return Ok(result);
    }

    // GET: api/menucategories/{id}
    [HttpGet("{id:guid}")]
    [HasPermission(PermissionCodes.MenuView)]
    public async Task<IActionResult> GetById(
        Guid id,
        CancellationToken cancellationToken)
    {
        var result = await _mediator.Send(
            new GetMenuCategoryByIdQuery(id),
            cancellationToken);

        if (result == null)
        {
            return NotFound(new
            {
                Message = "Không tìm thấy danh mục món ăn."
            });
        }

        return Ok(result);
    }

    // POST: api/menucategories
    [HttpPost]
    [HasPermission(PermissionCodes.MenuManage)]
    public async Task<IActionResult> Create(
        [FromBody] CreateMenuCategoryCommand command,
        CancellationToken cancellationToken)
    {
        var id = await _mediator.Send(command, cancellationToken);

        return CreatedAtAction(
            nameof(GetById),
            new { id },
            new
            {
                Id = id,
                Message = "Tạo danh mục món ăn thành công."
            });
    }

    // PUT: api/menucategories/{id}
    [HttpPut("{id:guid}")]
    [HasPermission(PermissionCodes.MenuManage)]
    public async Task<IActionResult> Update(
        Guid id,
        [FromBody] UpdateMenuCategoryCommand command,
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
                Message = "Cập nhật danh mục món ăn thất bại."
            });
        }

        return Ok(new
        {
            Message = "Cập nhật danh mục món ăn thành công."
        });
    }

    // DELETE: api/menucategories/{id}
    [HttpDelete("{id:guid}")]
    [HasPermission(PermissionCodes.MenuManage)]
    public async Task<IActionResult> Delete(
        Guid id,
        CancellationToken cancellationToken)
    {
        var result = await _mediator.Send(
            new DeleteMenuCategoryCommand(id),
            cancellationToken);

        if (!result)
        {
            return BadRequest(new
            {
                Message = "Xóa danh mục món ăn thất bại."
            });
        }

        return Ok(new
        {
            Message = "Xóa danh mục món ăn thành công."
        });
    }
}