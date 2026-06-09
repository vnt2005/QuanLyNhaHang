using MediatR;
using Microsoft.EntityFrameworkCore;
using QuanLyNhaHang.Application.Common.Interfaces;

namespace QuanLyNhaHang.Application.Features.Permissions.Commands.Delete;

public class DeletePermissionCommandHandler : IRequestHandler<DeletePermissionCommand, bool>
{
    private readonly IApplicationDbContext _context;

    public DeletePermissionCommandHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<bool> Handle(
        DeletePermissionCommand request,
        CancellationToken cancellationToken)
    {
        var permission = await _context.Permissions
            .FirstOrDefaultAsync(x => x.Id == request.Id, cancellationToken);

        if (permission == null)
            throw new Exception("Không tìm thấy quyền.");

        permission.Deactivate();

        await _context.SaveChangesAsync(cancellationToken);

        return true;
    }
}