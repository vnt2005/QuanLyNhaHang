using MediatR;
using Microsoft.EntityFrameworkCore;
using QuanLyNhaHang.Application.Common.Constants;
using QuanLyNhaHang.Application.Common.Interfaces;
using QuanLyNhaHang.Application.Features.Roles.DTOs;
using QuanLyNhaHang.Domain.Entities;

namespace QuanLyNhaHang.Application.Features.Roles.Commands.SyncSystem;

public sealed class SyncSystemRolesCommandHandler
    : IRequestHandler<SyncSystemRolesCommand, SystemRoleSyncResultDto>
{
    private readonly IApplicationDbContext _context;

    public SyncSystemRolesCommandHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<SystemRoleSyncResultDto> Handle(
        SyncSystemRolesCommand request,
        CancellationToken cancellationToken)
    {
        var existingRoles = await _context.Roles
            .AsNoTracking()
            .Select(role => role.Name)
            .ToListAsync(cancellationToken);
        var existingRoleNames = existingRoles.ToHashSet(
            StringComparer.OrdinalIgnoreCase);

        var activePermissions = await _context.Permissions
            .AsNoTracking()
            .Where(permission => permission.IsActive)
            .ToListAsync(cancellationToken);
        var permissionsByCode = activePermissions.ToDictionary(
            permission => permission.Code,
            StringComparer.OrdinalIgnoreCase);

        var createdRoles = new List<Role>();
        var rolePermissions = new List<RolePermission>();
        var skippedPermissionCount = 0;

        foreach (var definition in SystemRoleCatalog.All)
        {
            // Existing database configuration is authoritative. Do not update
            // metadata or restore permissions that an administrator removed.
            if (existingRoleNames.Contains(definition.Name))
                continue;

            var role = new Role(
                definition.Name,
                definition.DisplayName,
                definition.Description);
            createdRoles.Add(role);
            existingRoleNames.Add(definition.Name);

            foreach (var permissionCode in definition.DefaultPermissionCodes
                         .Distinct(StringComparer.OrdinalIgnoreCase))
            {
                if (!permissionsByCode.TryGetValue(permissionCode, out var permission))
                {
                    skippedPermissionCount++;
                    continue;
                }

                rolePermissions.Add(new RolePermission(role.Id, permission.Id));
            }
        }

        if (createdRoles.Count > 0)
            await _context.Roles.AddRangeAsync(createdRoles, cancellationToken);

        if (rolePermissions.Count > 0)
        {
            await _context.RolePermissions.AddRangeAsync(
                rolePermissions,
                cancellationToken);
        }

        if (createdRoles.Count > 0 || rolePermissions.Count > 0)
            await _context.SaveChangesAsync(cancellationToken);

        return new SystemRoleSyncResultDto
        {
            CatalogCount = SystemRoleCatalog.All.Count,
            CreatedRoleCount = createdRoles.Count,
            ExistingRoleCount = SystemRoleCatalog.All.Count - createdRoles.Count,
            AddedRolePermissionCount = rolePermissions.Count,
            SkippedPermissionCount = skippedPermissionCount,
            CreatedRoleNames = createdRoles
                .Select(role => role.Name)
                .OrderBy(name => name, StringComparer.Ordinal)
                .ToArray()
        };
    }
}
