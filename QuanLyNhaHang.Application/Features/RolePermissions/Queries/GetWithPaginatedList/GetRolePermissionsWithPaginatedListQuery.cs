using MediatR;
using QuanLyNhaHang.Application.Common.Models;
using QuanLyNhaHang.Application.Features.RolePermissions.DTOs;

namespace QuanLyNhaHang.Application.Features.RolePermissions.Queries.GetWithPaginatedList;

public class GetRolePermissionsWithPaginatedListQuery : IRequest<PaginatedList<RolePermissionDto>>
{
    public string? Keyword { get; set; }

    public Guid? RoleId { get; set; }

    public Guid? PermissionId { get; set; }

    public string? PermissionGroupName { get; set; }

    public int PageNumber { get; set; } = 1;

    public int PageSize { get; set; } = 10;
}