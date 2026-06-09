using MediatR;
using Microsoft.AspNetCore.Mvc;
using QuanLyNhaHang.Application.Features.Roles.Commands.Create;
using QuanLyNhaHang.Application.Features.Roles.Commands.Delete;
using QuanLyNhaHang.Application.Features.Roles.Commands.Update;
using QuanLyNhaHang.Application.Features.Roles.Queries.GetById;
using QuanLyNhaHang.Application.Features.Roles.Queries.GetList;
using QuanLyNhaHang.Application.Features.Roles.Queries.GetWithPaginatedList;

namespace QuanLyNhaHang.Api.Controllers;

[ApiController]
[Route("api/roles")]
public class RolesController : ControllerBase
{
    private readonly IMediator _mediator;

    public RolesController(IMediator mediator)
    {
        _mediator = mediator;
    }

    [HttpGet]
    public async Task<IActionResult> GetList([FromQuery] bool? isActive)
    {
        var result = await _mediator.Send(new GetRolesQuery
        {
            IsActive = isActive
        });

        return Ok(result);
    }

    [HttpGet("paginated")]
    public async Task<IActionResult> GetWithPaginatedList(
        [FromQuery] string? keyword,
        [FromQuery] bool? isActive,
        [FromQuery] int pageNumber = 1,
        [FromQuery] int pageSize = 10)
    {
        var result = await _mediator.Send(new GetRolesWithPaginatedListQuery
        {
            Keyword = keyword,
            IsActive = isActive,
            PageNumber = pageNumber,
            PageSize = pageSize
        });

        return Ok(result);
    }

    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetById(Guid id)
    {
        var result = await _mediator.Send(new GetRoleByIdQuery
        {
            Id = id
        });

        if (result == null)
            return NotFound(new
            {
                message = "Không tìm thấy vai trò."
            });

        return Ok(result);
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateRoleCommand command)
    {
        var result = await _mediator.Send(command);

        return Ok(new
        {
            success = true,
            message = "Tạo vai trò thành công.",
            data = result
        });
    }

    [HttpPut("{id:guid}")]
    public async Task<IActionResult> Update(
        Guid id,
        [FromBody] UpdateRoleCommand command)
    {
        command.Id = id;

        var result = await _mediator.Send(command);

        return Ok(new
        {
            success = true,
            message = "Cập nhật vai trò thành công.",
            data = result
        });
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id)
    {
        var result = await _mediator.Send(new DeleteRoleCommand
        {
            Id = id
        });

        return Ok(new
        {
            success = result,
            message = "Vô hiệu hóa vai trò thành công."
        });
    }
}