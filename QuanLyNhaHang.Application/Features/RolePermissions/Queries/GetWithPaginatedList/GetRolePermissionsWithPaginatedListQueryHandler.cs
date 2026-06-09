using MediatR;
using Microsoft.EntityFrameworkCore;
using QuanLyNhaHang.Application.Common.Interfaces;
using QuanLyNhaHang.Application.Common.Models;
using QuanLyNhaHang.Application.Features.RolePermissions.DTOs;

namespace QuanLyNhaHang.Application.Features.RolePermissions.Queries.GetWithPaginatedList;

public class GetRolePermissionsWithPaginatedListQueryHandler
    : IRequestHandler<GetRolePermissionsWithPaginatedListQuery, PaginatedList<RolePermissionDto>>
{
    private readonly IApplicationDbContext _context;

    public GetRolePermissionsWithPaginatedListQueryHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<PaginatedList<RolePermissionDto>> Handle(
        GetRolePermissionsWithPaginatedListQuery request,
        CancellationToken cancellationToken)
    {
        var query =
            from rolePermission in _context.RolePermissions.AsNoTracking()
            join role in _context.Roles.AsNoTracking()
                on rolePermission.RoleId equals role.Id
            join permission in _context.Permissions.AsNoTracking()
                on rolePermission.PermissionId equals permission.Id
            select new
            {
                RolePermission = rolePermission,
                Role = role,
                Permission = permission
            };

        if (!string.IsNullOrWhiteSpace(request.Keyword))
        {
            var keyword = request.Keyword.Trim();

            query = query.Where(x =>
                x.Role.Name.Contains(keyword) ||
                x.Role.DisplayName.Contains(keyword) ||
                x.Permission.Code.Contains(keyword) ||
                x.Permission.Name.Contains(keyword) ||
                x.Permission.GroupName.Contains(keyword));
        }

        if (request.RoleId.HasValue)
        {
            query = query.Where(x => x.RolePermission.RoleId == request.RoleId.Value);
        }

        if (request.PermissionId.HasValue)
        {
            query = query.Where(x => x.RolePermission.PermissionId == request.PermissionId.Value);
        }

        if (!string.IsNullOrWhiteSpace(request.PermissionGroupName))
        {
            query = query.Where(x => x.Permission.GroupName == request.PermissionGroupName);
        }

        var rolePermissionDtos = query
            .OrderBy(x => x.Role.Name)
            .ThenBy(x => x.Permission.GroupName)
            .ThenBy(x => x.Permission.Code)
            .Select(x => new RolePermissionDto
            {
                Id = x.RolePermission.Id,
                RoleId = x.Role.Id,
                RoleName = x.Role.Name,
                RoleDisplayName = x.Role.DisplayName,
                PermissionId = x.Permission.Id,
                PermissionCode = x.Permission.Code,
                PermissionName = x.Permission.Name,
                PermissionGroupName = x.Permission.GroupName,
                CreatedAt = x.RolePermission.CreatedAt
            });

        return await PaginatedList<RolePermissionDto>.CreateAsync(
            rolePermissionDtos,
            request.PageNumber,
            request.PageSize);
    }
}