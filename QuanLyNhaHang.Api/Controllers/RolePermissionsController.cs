using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using QuanLyNhaHang.Application.Common.Constants;
using QuanLyNhaHang.Application.Features.RolePermissions.Commands.Create;
using QuanLyNhaHang.Application.Features.RolePermissions.Commands.Delete;
using QuanLyNhaHang.Application.Features.RolePermissions.Commands.Update;
using QuanLyNhaHang.Application.Features.RolePermissions.Queries.GetById;
using QuanLyNhaHang.Application.Features.RolePermissions.Queries.GetList;
using QuanLyNhaHang.Application.Features.RolePermissions.Queries.GetWithPaginatedList;

namespace QuanLyNhaHang.Api.Controllers;

[ApiController]
[Route("api/role-permissions")]
[Authorize]
public class RolePermissionsController : ControllerBase
{
    private readonly IMediator _mediator;

    public RolePermissionsController(IMediator mediator)
    {
        _mediator = mediator;
    }

    [HttpGet]
    [HasPermission(PermissionCodes.RolePermissionsView)]
    public async Task<IActionResult> GetList(
        [FromQuery] Guid? roleId,
        [FromQuery] Guid? permissionId,
        [FromQuery] string? permissionGroupName)
    {
        var result = await _mediator.Send(new GetRolePermissionsQuery
        {
            RoleId = roleId,
            PermissionId = permissionId,
            PermissionGroupName = permissionGroupName
        });

        return Ok(result);
    }

    [HttpGet("paginated")]
    [HasPermission(PermissionCodes.RolePermissionsView)]
    public async Task<IActionResult> GetWithPaginatedList(
        [FromQuery] string? keyword,
        [FromQuery] Guid? roleId,
        [FromQuery] Guid? permissionId,
        [FromQuery] string? permissionGroupName,
        [FromQuery] int pageNumber = 1,
        [FromQuery] int pageSize = 10)
    {
        var result = await _mediator.Send(new GetRolePermissionsWithPaginatedListQuery
        {
            Keyword = keyword,
            RoleId = roleId,
            PermissionId = permissionId,
            PermissionGroupName = permissionGroupName,
            PageNumber = pageNumber,
            PageSize = pageSize
        });

        return Ok(result);
    }

    [HttpGet("{id:guid}")]
    [HasPermission(PermissionCodes.RolePermissionsView)]
    public async Task<IActionResult> GetById(Guid id)
    {
        var result = await _mediator.Send(new GetRolePermissionByIdQuery
        {
            Id = id
        });

        if (result == null)
            return NotFound(new
            {
                message = "Không tìm thấy quyền của vai trò."
            });

        return Ok(result);
    }

    [HttpGet("roles/{roleId:guid}/permissions")]
    [HasPermission(PermissionCodes.RolePermissionsView)]
    public async Task<IActionResult> GetRoleWithPermissions(Guid roleId)
    {
        var result = await _mediator.Send(new GetRoleWithPermissionsByRoleIdQuery
        {
            RoleId = roleId
        });

        if (result == null)
            return NotFound(new
            {
                message = "Không tìm thấy vai trò."
            });

        return Ok(result);
    }

    [HttpGet("roles/{roleId:guid}/selection")]
    [HasPermission(PermissionCodes.RolePermissionsView)]
    public async Task<IActionResult> GetRolePermissionSelection(Guid roleId)
    {
        var result = await _mediator.Send(new GetRolePermissionSelectionByRoleIdQuery
        {
            RoleId = roleId
        });

        if (result == null)
            return NotFound(new
            {
                message = "Không tìm thấy vai trò."
            });

        return Ok(result);
    }

    [HttpPost]
    [HasPermission(PermissionCodes.RolePermissionsManage)]
    public async Task<IActionResult> Create([FromBody] CreateRolePermissionCommand command)
    {
        var result = await _mediator.Send(command);

        return Ok(new
        {
            success = true,
            message = "Gán quyền cho vai trò thành công.",
            data = result
        });
    }

    [HttpPut("roles/{roleId:guid}")]
    [HasPermission(PermissionCodes.RolePermissionsManage)]
    public async Task<IActionResult> UpdateRolePermissions(
        Guid roleId,
        [FromBody] UpdateRolePermissionsCommand command)
    {
        command.RoleId = roleId;

        var result = await _mediator.Send(command);

        return Ok(new
        {
            success = true,
            message = "Cập nhật danh sách quyền của vai trò thành công.",
            data = result
        });
    }

    [HttpDelete("{id:guid}")]
    [HasPermission(PermissionCodes.RolePermissionsManage)]
    public async Task<IActionResult> Delete(Guid id)
    {
        var result = await _mediator.Send(new DeleteRolePermissionCommand
        {
            Id = id
        });

        return Ok(new
        {
            success = result,
            message = "Xóa quyền khỏi vai trò thành công."
        });
    }

    [HttpDelete("roles/{roleId:guid}/permissions/{permissionId:guid}")]
    [HasPermission(PermissionCodes.RolePermissionsManage)]
    public async Task<IActionResult> DeleteByRoleAndPermission(
        Guid roleId,
        Guid permissionId)
    {
        var result = await _mediator.Send(new DeleteRolePermissionByRoleAndPermissionCommand
        {
            RoleId = roleId,
            PermissionId = permissionId
        });

        return Ok(new
        {
            success = result,
            message = "Xóa quyền khỏi vai trò thành công."
        });
    }
}
