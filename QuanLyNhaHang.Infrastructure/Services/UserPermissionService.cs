using Microsoft.EntityFrameworkCore;
using QuanLyNhaHang.Application.Common.Constants;
using QuanLyNhaHang.Application.Common.Interfaces;

namespace QuanLyNhaHang.Infrastructure.Services;

public sealed class UserPermissionService : IUserPermissionService
{
    private readonly IApplicationDbContext _context;

    public UserPermissionService(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<IReadOnlyCollection<string>> GetPermissionsAsync(
        string roleName,
        CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(roleName))
            return Array.Empty<string>();

        var normalizedRoleName = roleName.Trim();

        var role = await _context.Roles
            .AsNoTracking()
            .Where(x => x.Name == normalizedRoleName)
            .Select(x => new
            {
                x.Id,
                x.IsActive
            })
            .FirstOrDefaultAsync(cancellationToken);

        // A fresh installation may not have role rows yet. Built-in employee
        // roles still need safe defaults so accounts created by Admin work.
        if (role == null)
        {
            return DefaultRolePermissions.GetForRole(
                normalizedRoleName);
        }

        // An explicitly disabled role must never regain fallback permissions.
        if (!role.IsActive)
            return Array.Empty<string>();

        // Once a role exists in the database, its configured permissions are
        // authoritative. An empty mapping therefore intentionally means no access.
        return await (
            from rolePermission in _context.RolePermissions.AsNoTracking()
            join permission in _context.Permissions.AsNoTracking()
                on rolePermission.PermissionId equals permission.Id
            where
                rolePermission.RoleId == role.Id &&
                permission.IsActive
            orderby permission.Code
            select permission.Code
        )
        .Distinct()
        .ToListAsync(cancellationToken);
    }
}
