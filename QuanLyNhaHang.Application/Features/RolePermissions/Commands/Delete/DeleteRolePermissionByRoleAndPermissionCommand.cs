using MediatR;

namespace QuanLyNhaHang.Application.Features.RolePermissions.Commands.Delete;

public class DeleteRolePermissionByRoleAndPermissionCommand : IRequest<bool>
{
    public Guid RoleId { get; set; }

    public Guid PermissionId { get; set; }
}