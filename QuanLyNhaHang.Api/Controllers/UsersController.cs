using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using QuanLyNhaHang.Application.Common.Constants;
using QuanLyNhaHang.Application.Features.Users.Commands.Create;
using QuanLyNhaHang.Application.Features.Users.Commands.Delete;
using QuanLyNhaHang.Application.Features.Users.Commands.Update;
using QuanLyNhaHang.Application.Features.Users.Queries.GetById;
using QuanLyNhaHang.Application.Features.Users.Queries.GetList;
using QuanLyNhaHang.Application.Features.Users.Queries.GetWithPaginatedList;

namespace QuanLyNhaHang.Api.Controllers;

[Route("api/[controller]")]
[ApiController]
[Authorize]
public class UsersController : ControllerBase
{
    private readonly IMediator _mediator;

    public UsersController(IMediator mediator)
    {
        _mediator = mediator;
    }

    [HttpGet]
    [HasPermission(PermissionCodes.UsersView)]
    public async Task<IActionResult> GetList(CancellationToken cancellationToken)
    {
        var result = await _mediator.Send(
            new GetUserListQuery(),
            cancellationToken);

        return Ok(result);
    }

    [HttpGet("paginated")]
    [HasPermission(PermissionCodes.UsersView)]
    public async Task<IActionResult> GetWithPaginatedList(
        [FromQuery] string? keyword,
        [FromQuery] int pageNumber = 1,
        [FromQuery] int pageSize = 10,
        CancellationToken cancellationToken = default)
    {
        var query = new GetUsersWithPaginatedListQuery
        {
            Keyword = keyword,
            PageNumber = pageNumber,
            PageSize = pageSize
        };

        var result = await _mediator.Send(query, cancellationToken);

        return Ok(result);
    }

    [HttpGet("{id:guid}")]
    [HasPermission(PermissionCodes.UsersView)]
    public async Task<IActionResult> GetById(
        Guid id,
        CancellationToken cancellationToken)
    {
        var result = await _mediator.Send(
            new GetUserByIdQuery(id),
            cancellationToken);

        if (result == null)
        {
            return NotFound(new
            {
                Message = "Không tìm thấy người dùng."
            });
        }

        return Ok(result);
    }

    [HttpPost]
    [HasPermission(PermissionCodes.UsersManage)]
    public async Task<IActionResult> Create(
        [FromBody] CreateUserCommand command,
        CancellationToken cancellationToken)
    {
        var id = await _mediator.Send(command, cancellationToken);

        return CreatedAtAction(
            nameof(GetById),
            new { id },
            new
            {
                Id = id,
                Message = "Tạo người dùng thành công."
            });
    }

    [HttpPut("{id:guid}")]
    [HasPermission(PermissionCodes.UsersManage)]
    public async Task<IActionResult> Update(
        Guid id,
        [FromBody] UpdateUserCommand command,
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
                Message = "Cập nhật người dùng thất bại."
            });
        }

        return Ok(new
        {
            Message = "Cập nhật người dùng thành công."
        });
    }

    [HttpDelete("{id:guid}")]
    [HasPermission(PermissionCodes.UsersManage)]
    public async Task<IActionResult> Delete(
        Guid id,
        CancellationToken cancellationToken)
    {
        var result = await _mediator.Send(
            new DeleteUserCommand(id),
            cancellationToken);

        if (!result)
        {
            return BadRequest(new
            {
                Message = "Xóa người dùng thất bại."
            });
        }

        return Ok(new
        {
            Message = "Xóa người dùng thành công."
        });
    }
}
