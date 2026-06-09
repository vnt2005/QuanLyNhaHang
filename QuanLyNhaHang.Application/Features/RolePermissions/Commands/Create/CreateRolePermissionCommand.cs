using MediatR;
using QuanLyNhaHang.Application.Features.RolePermissions.DTOs;

namespace QuanLyNhaHang.Application.Features.RolePermissions.Commands.Create;

public class CreateRolePermissionCommand : IRequest<RolePermissionDto>
{
    public Guid RoleId { get; set; }

    public Guid PermissionId { get; set; }
}