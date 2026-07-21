using MediatR;
using Microsoft.EntityFrameworkCore;
using QuanLyNhaHang.Application.Common.Constants;
using QuanLyNhaHang.Application.Common.Interfaces;
using QuanLyNhaHang.Application.Features.RolePermissions.DTOs;
using QuanLyNhaHang.Domain.Entities;

namespace QuanLyNhaHang.Application.Features.RolePermissions.Commands.Update;

public class UpdateRolePermissionsCommandHandler
    : IRequestHandler<UpdateRolePermissionsCommand, RoleWithPermissionsDto>
{
    private readonly IApplicationDbContext _context;

    public UpdateRolePermissionsCommandHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<RoleWithPermissionsDto> Handle(
        UpdateRolePermissionsCommand request,
        CancellationToken cancellationToken)
    {
        var role = await _context.Roles
            .FirstOrDefaultAsync(x => x.Id == request.RoleId, cancellationToken);

        if (role == null)
            throw new Exception("Không tìm thấy vai trò.");

        if (!role.IsActive)
            throw new Exception("Vai trò đã bị vô hiệu hóa.");

        var permissionIds = (request.PermissionIds ?? new List<Guid>())
            .Where(x => x != Guid.Empty)
            .Distinct()
            .ToList();
        var mustRemainWithoutPermissions =
            SystemRoleCatalog.MustRemainWithoutPermissions(role.Name);

        if (mustRemainWithoutPermissions && permissionIds.Count > 0)
        {
            throw new InvalidOperationException(
                $"Vai trò {role.Name} phải luôn không có RolePermission. " +
                "Chỉ có thể gửi danh sách rỗng để dọn dữ liệu legacy.");
        }

        var permissions = await _context.Permissions
            .Where(x =>
                permissionIds.Contains(x.Id) &&
                x.IsActive)
            .ToListAsync(cancellationToken);

        if (permissions.Count != permissionIds.Count)
            throw new Exception("Có quyền không tồn tại hoặc đã bị vô hiệu hóa.");

        var oldRolePermissions = await _context.RolePermissions
            .Where(x => x.RoleId == role.Id)
            .ToListAsync(cancellationToken);

        if (!mustRemainWithoutPermissions &&
            permissionIds.Count == 0 &&
            oldRolePermissions.Count > 0 &&
            !request.ConfirmRemoveAll)
        {
            throw new InvalidOperationException(
                "Không thể xóa toàn bộ quyền của vai trò khi chưa xác nhận. " +
                "Hãy gửi confirmRemoveAll = true nếu đây là thao tác có chủ đích.");
        }

        if (oldRolePermissions.Count > 0)
        {
            _context.RolePermissions.RemoveRange(oldRolePermissions);
        }

        var newRolePermissions = permissions
            .Select(permission => new RolePermission(role.Id, permission.Id))
            .ToList();

        if (newRolePermissions.Count > 0)
        {
            await _context.RolePermissions.AddRangeAsync(
                newRolePermissions,
                cancellationToken);
        }

        await _context.SaveChangesAsync(cancellationToken);

        return new RoleWithPermissionsDto
        {
            RoleId = role.Id,
            RoleName = role.Name,
            RoleDisplayName = role.DisplayName,
            RoleDescription = role.Description,
            IsActive = role.IsActive,
            Permissions = permissions
                .OrderBy(x => x.GroupName)
                .ThenBy(x => x.Code)
                .Select(x => new PermissionInRoleDto
                {
                    PermissionId = x.Id,
                    PermissionCode = x.Code,
                    PermissionName = x.Name,
                    PermissionGroupName = x.GroupName,
                    Description = x.Description,
                    IsActive = x.IsActive
                })
                .ToList()
        };
    }
}