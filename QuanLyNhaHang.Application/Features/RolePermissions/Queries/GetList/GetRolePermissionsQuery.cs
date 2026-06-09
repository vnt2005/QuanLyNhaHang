using MediatR;
using QuanLyNhaHang.Application.Features.RolePermissions.DTOs;

namespace QuanLyNhaHang.Application.Features.RolePermissions.Queries.GetList;

public class GetRolePermissionsQuery : IRequest<List<RolePermissionDto>>
{
    public Guid? RoleId { get; set; }

    public Guid? PermissionId { get; set; }

    public string? PermissionGroupName { get; set; }
}