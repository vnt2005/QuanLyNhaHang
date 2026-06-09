using MediatR;
using Microsoft.EntityFrameworkCore;
using QuanLyNhaHang.Application.Common.Interfaces;
using QuanLyNhaHang.Application.Features.RolePermissions.DTOs;

namespace QuanLyNhaHang.Application.Features.RolePermissions.Queries.GetList;

public class GetRolePermissionsQueryHandler
    : IRequestHandler<GetRolePermissionsQuery, List<RolePermissionDto>>
{
    private readonly IApplicationDbContext _context;

    public GetRolePermissionsQueryHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<List<RolePermissionDto>> Handle(
        GetRolePermissionsQuery request,
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

        var result = await query
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
            })
            .ToListAsync(cancellationToken);

        return result;
    }
}