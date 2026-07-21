using MediatR;
using Microsoft.EntityFrameworkCore;
using QuanLyNhaHang.Application.Common.Constants;
using QuanLyNhaHang.Application.Common.Interfaces;
using QuanLyNhaHang.Application.Features.RolePermissions.DTOs;
using QuanLyNhaHang.Domain.Entities;

namespace QuanLyNhaHang.Application.Features.RolePermissions.Commands.Create;

public class CreateRolePermissionCommandHandler
    : IRequestHandler<CreateRolePermissionCommand, RolePermissionDto>
{
    private readonly IApplicationDbContext _context;

    public CreateRolePermissionCommandHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<RolePermissionDto> Handle(
        CreateRolePermissionCommand request,
        CancellationToken cancellationToken)
    {
        var role = await _context.Roles
            .FirstOrDefaultAsync(x => x.Id == request.RoleId, cancellationToken);

        if (role == null)
            throw new Exception("Không tìm thấy vai trò.");

        if (!role.IsActive)
            throw new Exception("Vai trò đã bị vô hiệu hóa.");

        if (SystemRoleCatalog.MustRemainWithoutPermissions(role.Name))
        {
            throw new InvalidOperationException(
                $"Vai trò {role.Name} phải luôn không có RolePermission. " +
                "Admin dùng cơ chế bypass, còn Customer không được truy cập API quản trị.");
        }

        var permission = await _context.Permissions
            .FirstOrDefaultAsync(x => x.Id == request.PermissionId, cancellationToken);

        if (permission == null)
            throw new Exception("Không tìm thấy quyền.");

        if (!permission.IsActive)
            throw new Exception("Quyền đã bị vô hiệu hóa.");

        var existedRolePermission = await _context.RolePermissions
            .AnyAsync(x =>
                x.RoleId == request.RoleId &&
                x.PermissionId == request.PermissionId,
                cancellationToken);

        if (existedRolePermission)
            throw new Exception("Vai trò này đã có quyền này.");

        var rolePermission = new RolePermission(
            request.RoleId,
            request.PermissionId);

        await _context.RolePermissions.AddAsync(rolePermission, cancellationToken);

        await _context.SaveChangesAsync(cancellationToken);

        return new RolePermissionDto
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
        };
    }
}