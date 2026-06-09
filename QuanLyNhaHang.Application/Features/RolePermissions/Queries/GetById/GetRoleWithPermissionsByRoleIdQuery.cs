using MediatR;
using QuanLyNhaHang.Application.Features.RolePermissions.DTOs;

namespace QuanLyNhaHang.Application.Features.RolePermissions.Queries.GetById;

public class GetRoleWithPermissionsByRoleIdQuery : IRequest<RoleWithPermissionsDto?>
{
    public Guid RoleId { get; set; }
}