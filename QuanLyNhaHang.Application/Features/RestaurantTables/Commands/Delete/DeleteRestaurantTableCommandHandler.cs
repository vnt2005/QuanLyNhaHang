using MediatR;
using Microsoft.EntityFrameworkCore;
using QuanLyNhaHang.Application.Common.Interfaces;

namespace QuanLyNhaHang.Application.Features.RestaurantTables.Commands.Delete;

public class DeleteRestaurantTableCommandHandler
    : IRequestHandler<DeleteRestaurantTableCommand, bool>
{
    private readonly IApplicationDbContext _context;

    public DeleteRestaurantTableCommandHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<bool> Handle(
        DeleteRestaurantTableCommand request,
        CancellationToken cancellationToken)
    {
        var table = await _context.RestaurantTables
            .FirstOrDefaultAsync(
                x => x.Id == request.Id && x.IsActive,
                cancellationToken);

        if (table == null)
        {
            return false;
        }

        var activeQrCodes = await _context.TableQrCodes
            .Where(x =>
                x.RestaurantTableId == table.Id &&
                x.IsActive)
            .ToListAsync(cancellationToken);

        foreach (var qrCode in activeQrCodes)
        {
            qrCode.Deactivate();
        }

        table.Deactivate();

        await _context.SaveChangesAsync(cancellationToken);

        return true;
    }
}