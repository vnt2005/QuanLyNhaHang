using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using QuanLyNhaHang.Application.Common.Constants;
using QuanLyNhaHang.Application.Features.Permissions.Commands.SyncCatalog;
using QuanLyNhaHang.Application.Features.Roles.Commands.Create;
using QuanLyNhaHang.Application.Features.Roles.Commands.Delete;
using QuanLyNhaHang.Application.Features.Roles.Commands.SyncSystem;
using QuanLyNhaHang.Application.Features.Roles.Commands.Update;
using QuanLyNhaHang.Application.Features.Roles.Queries.GetById;
using QuanLyNhaHang.Application.Features.Roles.Queries.GetList;
using QuanLyNhaHang.Application.Features.Roles.Queries.GetWithPaginatedList;

namespace QuanLyNhaHang.Api.Controllers;

[ApiController]
[Route("api/roles")]
[Authorize]
public class RolesController : ControllerBase
{
    private readonly IMediator _mediator;

    public RolesController(IMediator mediator)
    {
        _mediator = mediator;
    }

    [HttpGet]
    [HasPermission(PermissionCodes.RolesView)]
    public async Task<IActionResult> GetList([FromQuery] bool? isActive)
    {
        var result = await _mediator.Send(new GetRolesQuery
        {
            IsActive = isActive
        });

        return Ok(result);
    }

    [HttpGet("paginated")]
    [HasPermission(PermissionCodes.RolesView)]
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
    [HasPermission(PermissionCodes.RolesView)]
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
    [HasPermission(PermissionCodes.RolesManage)]
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

    [HttpPost("sync-system")]
    [HasPermission(PermissionCodes.RolesManage)]
    public async Task<IActionResult> SyncSystemRoles()
    {
        var permissionResult = await _mediator.Send(
            new SyncPermissionCatalogCommand());
        var roleResult = await _mediator.Send(
            new SyncSystemRolesCommand());

        return Ok(new
        {
            success = true,
            message = "Đồng bộ vai trò hệ thống thành công.",
            data = new
            {
                permissions = permissionResult,
                roles = roleResult
            }
        });
    }

    [HttpPut("{id:guid}")]
    [HasPermission(PermissionCodes.RolesManage)]
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
    [HasPermission(PermissionCodes.RolesManage)]
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
