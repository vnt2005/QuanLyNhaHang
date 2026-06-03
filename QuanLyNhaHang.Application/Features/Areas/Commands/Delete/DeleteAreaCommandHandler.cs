using MediatR;
using Microsoft.EntityFrameworkCore;
using QuanLyNhaHang.Application.Common.Interfaces;

namespace QuanLyNhaHang.Application.Features.Areas.Commands.Delete;

public class DeleteAreaCommandHandler : IRequestHandler<DeleteAreaCommand, bool>
{
    private readonly IApplicationDbContext _context;

    public DeleteAreaCommandHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<bool> Handle(
        DeleteAreaCommand request,
        CancellationToken cancellationToken)
    {
        var area = await _context.Areas
            .FirstOrDefaultAsync(x => x.Id == request.Id, cancellationToken);

        if (area == null)
        {
            return false;
        }

        area.Deactivate();

        await _context.SaveChangesAsync(cancellationToken);

        return true;
    }
}