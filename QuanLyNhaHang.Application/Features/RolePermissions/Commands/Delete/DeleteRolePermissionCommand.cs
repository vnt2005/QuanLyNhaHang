using MediatR;

namespace QuanLyNhaHang.Application.Features.RolePermissions.Commands.Delete;

public class DeleteRolePermissionCommand : IRequest<bool>
{
    public Guid Id { get; set; }
}