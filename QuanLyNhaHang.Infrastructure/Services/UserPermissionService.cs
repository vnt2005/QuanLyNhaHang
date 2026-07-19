using Microsoft.EntityFrameworkCore;
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

        var roleId = await _context.Roles
            .AsNoTracking()
            .Where(x =>
                x.IsActive &&
                x.Name == normalizedRoleName)
            .Select(x => (Guid?)x.Id)
            .FirstOrDefaultAsync(cancellationToken);

        if (!roleId.HasValue)
            return Array.Empty<string>();

        return await (
            from rolePermission in _context.RolePermissions.AsNoTracking()
            join permission in _context.Permissions.AsNoTracking()
                on rolePermission.PermissionId equals permission.Id
            where
                rolePermission.RoleId == roleId.Value &&
                permission.IsActive
            orderby permission.Code
            select permission.Code
        )
        .Distinct()
        .ToListAsync(cancellationToken);
    }
}