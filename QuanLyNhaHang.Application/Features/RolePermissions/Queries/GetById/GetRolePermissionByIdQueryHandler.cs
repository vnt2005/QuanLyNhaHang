using MediatR;
using Microsoft.EntityFrameworkCore;
using QuanLyNhaHang.Application.Common.Interfaces;
using QuanLyNhaHang.Application.Features.RolePermissions.DTOs;

namespace QuanLyNhaHang.Application.Features.RolePermissions.Queries.GetById;

public class GetRolePermissionByIdQueryHandler
    : IRequestHandler<GetRolePermissionByIdQuery, RolePermissionDto?>
{
    private readonly IApplicationDbContext _context;

    public GetRolePermissionByIdQueryHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<RolePermissionDto?> Handle(
        GetRolePermissionByIdQuery request,
        CancellationToken cancellationToken)
    {
        var result = await (
            from rolePermission in _context.RolePermissions.AsNoTracking()
            join role in _context.Roles.AsNoTracking()
                on rolePermission.RoleId equals role.Id
            join permission in _context.Permissions.AsNoTracking()
                on rolePermission.PermissionId equals permission.Id
            where rolePermission.Id == request.Id
            select new RolePermissionDto
            {
                Id = rolePermission.Id,
                RoleId = role.Id,
                RoleName = role.Name,
                RoleDisplayName = role.DisplayName,
                PermissionId = permission.Id,
                PermissionCode = permission.Code,
                PermissionName = permission.Name,
                PermissionGroupName = permission.GroupName,
                CreatedAt = rolePermission.CreatedAt
            }
        ).FirstOrDefaultAsync(cancellationToken);

        return result;
    }
}