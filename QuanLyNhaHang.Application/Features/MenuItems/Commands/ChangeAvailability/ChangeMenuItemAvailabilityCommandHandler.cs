using MediatR;
using Microsoft.EntityFrameworkCore;
using QuanLyNhaHang.Application.Common.Interfaces;

namespace QuanLyNhaHang.Application.Features.MenuItems.Commands.ChangeAvailability;

public class ChangeMenuItemAvailabilityCommandHandler
    : IRequestHandler<ChangeMenuItemAvailabilityCommand, bool>
{
    private readonly IApplicationDbContext _context;

    public ChangeMenuItemAvailabilityCommandHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<bool> Handle(
        ChangeMenuItemAvailabilityCommand request,
        CancellationToken cancellationToken)
    {
        var menuItem = await _context.MenuItems
            .FirstOrDefaultAsync(x => x.Id == request.Id, cancellationToken);

        if (menuItem == null)
        {
            return false;
        }

        if (request.IsAvailable)
        {
            menuItem.MarkAvailable();
        }
        else
        {
            menuItem.MarkUnavailable();
        }

        await _context.SaveChangesAsync(cancellationToken);

        return true;
    }
}