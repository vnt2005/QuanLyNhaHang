using MediatR;
using Microsoft.EntityFrameworkCore;
using QuanLyNhaHang.Application.Common.Interfaces;

namespace QuanLyNhaHang.Application.Features.RolePermissions.Commands.Delete;

public class DeleteRolePermissionCommandHandler
    : IRequestHandler<DeleteRolePermissionCommand, bool>
{
    private readonly IApplicationDbContext _context;

    public DeleteRolePermissionCommandHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<bool> Handle(
        DeleteRolePermissionCommand request,
        CancellationToken cancellationToken)
    {
        var rolePermission = await _context.RolePermissions
            .FirstOrDefaultAsync(x => x.Id == request.Id, cancellationToken);

        if (rolePermission == null)
            throw new Exception("Không tìm thấy quyền của vai trò.");

        _context.RolePermissions.Remove(rolePermission);

        await _context.SaveChangesAsync(cancellationToken);

        return true;
    }
}