using MediatR;
using Microsoft.EntityFrameworkCore;
using QuanLyNhaHang.Application.Common.Interfaces;

namespace QuanLyNhaHang.Application.Features.MenuItems.Commands.Delete;

public class DeleteMenuItemCommandHandler
    : IRequestHandler<DeleteMenuItemCommand, bool>
{
    private readonly IApplicationDbContext _context;

    public DeleteMenuItemCommandHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<bool> Handle(
        DeleteMenuItemCommand request,
        CancellationToken cancellationToken)
    {
        var menuItem = await _context.MenuItems
            .FirstOrDefaultAsync(x => x.Id == request.Id, cancellationToken);

        if (menuItem == null)
        {
            return false;
        }

        menuItem.Deactivate();

        await _context.SaveChangesAsync(cancellationToken);

        return true;
    }
}