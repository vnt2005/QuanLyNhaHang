using MediatR;
using Microsoft.EntityFrameworkCore;
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

        _context.RolePermissions.Remove(rolePermission);

        await _context.SaveChangesAsync(cancellationToken);

        return true;
    }
}