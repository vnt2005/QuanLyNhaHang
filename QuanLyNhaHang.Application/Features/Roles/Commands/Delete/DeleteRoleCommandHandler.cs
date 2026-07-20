using MediatR;
using Microsoft.EntityFrameworkCore;
using QuanLyNhaHang.Application.Common.Constants;
using QuanLyNhaHang.Application.Common.Interfaces;

namespace QuanLyNhaHang.Application.Features.Roles.Commands.Delete;

public class DeleteRoleCommandHandler : IRequestHandler<DeleteRoleCommand, bool>
{
    private readonly IApplicationDbContext _context;

    public DeleteRoleCommandHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<bool> Handle(
        DeleteRoleCommand request,
        CancellationToken cancellationToken)
    {
        var role = await _context.Roles
            .FirstOrDefaultAsync(x => x.Id == request.Id, cancellationToken);

        if (role == null)
            throw new Exception("Không tìm thấy vai trò.");

        if (SystemRoleCatalog.IsSystemRole(role.Name))
        {
            throw new InvalidOperationException(
                $"Vai trò hệ thống '{role.Name}' không thể bị vô hiệu hóa hoặc xóa.");
        }

        role.Deactivate();

        await _context.SaveChangesAsync(cancellationToken);

        return true;
    }
}
