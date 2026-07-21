using MediatR;
using QuanLyNhaHang.Application.Features.RolePermissions.DTOs;

namespace QuanLyNhaHang.Application.Features.RolePermissions.Commands.Update;

public class UpdateRolePermissionsCommand : IRequest<RoleWithPermissionsDto>
{
    public Guid RoleId { get; set; }

    public List<Guid> PermissionIds { get; set; } = new();

    public bool ConfirmRemoveAll { get; set; }
}