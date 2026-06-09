using MediatR;
using Microsoft.EntityFrameworkCore;
using QuanLyNhaHang.Application.Common.Interfaces;
using QuanLyNhaHang.Application.Features.RolePermissions.DTOs;

namespace QuanLyNhaHang.Application.Features.RolePermissions.Queries.GetById;

public class GetRolePermissionSelectionByRoleIdQueryHandler
    : IRequestHandler<GetRolePermissionSelectionByRoleIdQuery, RolePermissionSelectionDto?>
{
    private readonly IApplicationDbContext _context;

    public GetRolePermissionSelectionByRoleIdQueryHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<RolePermissionSelectionDto?> Handle(
        GetRolePermissionSelectionByRoleIdQuery request,
        CancellationToken cancellationToken)
    {
        var role = await _context.Roles
            .AsNoTracking()
            .FirstOrDefaultAsync(x => x.Id == request.RoleId, cancellationToken);

        if (role == null)
            return null;

        var selectedPermissionIds = await _context.RolePermissions
            .AsNoTracking()
            .Where(x => x.RoleId == role.Id)
            .Select(x => x.PermissionId)
            .ToListAsync(cancellationToken);

        var permissions = await _context.Permissions
            .AsNoTracking()
            .OrderBy(x => x.GroupName)
            .ThenBy(x => x.Code)
            .Select(x => new PermissionSelectionDto
            {
                PermissionId = x.Id,
                PermissionCode = x.Code,
                PermissionName = x.Name,
                PermissionGroupName = x.GroupName,
                IsSelected = selectedPermissionIds.Contains(x.Id)
            })
            .ToListAsync(cancellationToken);

        return new RolePermissionSelectionDto
        {
            RoleId = role.Id,
            RoleName = role.Name,
            RoleDisplayName = role.DisplayName,
            Permissions = permissions
        };
    }
}