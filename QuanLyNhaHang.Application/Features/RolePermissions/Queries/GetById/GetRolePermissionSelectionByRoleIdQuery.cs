using MediatR;
using QuanLyNhaHang.Application.Features.RolePermissions.DTOs;

namespace QuanLyNhaHang.Application.Features.RolePermissions.Queries.GetById;

public class GetRolePermissionSelectionByRoleIdQuery : IRequest<RolePermissionSelectionDto?>
{
    public Guid RoleId { get; set; }
}