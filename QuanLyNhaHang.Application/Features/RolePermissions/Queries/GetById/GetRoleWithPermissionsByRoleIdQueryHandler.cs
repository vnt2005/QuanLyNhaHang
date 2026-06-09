using MediatR;
using Microsoft.EntityFrameworkCore;
using QuanLyNhaHang.Application.Common.Interfaces;
using QuanLyNhaHang.Application.Features.RolePermissions.DTOs;

namespace QuanLyNhaHang.Application.Features.RolePermissions.Queries.GetById;

public class GetRoleWithPermissionsByRoleIdQueryHandler
    : IRequestHandler<GetRoleWithPermissionsByRoleIdQuery, RoleWithPermissionsDto?>
{
    private readonly IApplicationDbContext _context;

    public GetRoleWithPermissionsByRoleIdQueryHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<RoleWithPermissionsDto?> Handle(
        GetRoleWithPermissionsByRoleIdQuery request,
        CancellationToken cancellationToken)
    {
        var role = await _context.Roles
            .AsNoTracking()
            .FirstOrDefaultAsync(x => x.Id == request.RoleId, cancellationToken);

        if (role == null)
            return null;

        var permissions = await (
            from rolePermission in _context.RolePermissions.AsNoTracking()
            join permission in _context.Permissions.AsNoTracking()
                on rolePermission.PermissionId equals permission.Id
            where rolePermission.RoleId == role.Id
            orderby permission.GroupName, permission.Code
            select new PermissionInRoleDto
            {
                PermissionId = permission.Id,
                PermissionCode = permission.Code,
                PermissionName = permission.Name,
                PermissionGroupName = permission.GroupName,
                Description = permission.Description,
                IsActive = permission.IsActive
            }
        ).ToListAsync(cancellationToken);

        return new RoleWithPermissionsDto
        {
            RoleId = role.Id,
            RoleName = role.Name,
            RoleDisplayName = role.DisplayName,
            RoleDescription = role.Description,
            IsActive = role.IsActive,
            Permissions = permissions
        };
    }
}