using MediatR;
using Microsoft.EntityFrameworkCore;
using QuanLyNhaHang.Application.Common.Constants;
using QuanLyNhaHang.Application.Common.Interfaces;

namespace QuanLyNhaHang.Application.Features.RolePermissions.Commands.Delete;

public class DeleteRolePermissionByRoleAndPermissionCommandHandler
    : IRequestHandler<DeleteRolePermissionByRoleAndPermissionCommand, bool>
{
    private readonly IApplicationDbContext _context;

    public DeleteRolePermissionByRoleAndPermissionCommandHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<bool> Handle(
        DeleteRolePermissionByRoleAndPermissionCommand request,
        CancellationToken cancellationToken)
    {
        var rolePermission = await _context.RolePermissions
            .FirstOrDefaultAsync(x =>
                x.RoleId == request.RoleId &&
                x.PermissionId == request.PermissionId,
                cancellationToken);

        if (rolePermission == null)
            throw new Exception("Vai trò này chưa được gán quyền này.");

        var role = await _context.Roles
            .FirstOrDefaultAsync(x => x.Id == request.RoleId, cancellationToken);

        if (role == null)
            throw new Exception("Không tìm thấy vai trò.");

        if (!SystemRoleCatalog.MustRemainWithoutPermissions(role.Name))
        {
            var rolePermissionCount = await _context.RolePermissions
                .CountAsync(x => x.RoleId == role.Id, cancellationToken);

            if (rolePermissionCount <= 1)
            {
                throw new InvalidOperationException(
                    "Không thể xóa quyền cuối cùng bằng endpoint xóa đơn lẻ. " +
                    "Hãy dùng PUT /api/role-permissions/roles/{roleId} với danh sách rỗng " +
                    "và confirmRemoveAll = true.");
            }
        }

        _context.RolePermissions.Remove(rolePermission);

        await _context.SaveChangesAsync(cancellationToken);

        return true;
    }
}