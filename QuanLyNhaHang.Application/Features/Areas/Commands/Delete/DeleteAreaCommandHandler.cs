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
            .FirstOrDefaultAsync(
                x => x.Id == request.Id && x.IsActive,
                cancellationToken);

        if (area == null)
        {
            return false;
        }

        var tables = await _context.RestaurantTables
            .Where(table =>
                table.AreaId == area.Id &&
                table.IsActive)
            .ToListAsync(cancellationToken);

        var tableIds = tables.Select(table => table.Id).ToList();
        var qrCodes = await _context.TableQrCodes
            .Where(qrCode =>
                tableIds.Contains(qrCode.RestaurantTableId) &&
                qrCode.IsActive)
            .ToListAsync(cancellationToken);

        foreach (var qrCode in qrCodes)
        {
            qrCode.Deactivate();
        }

        foreach (var table in tables)
        {
            table.Deactivate();
        }

        area.Deactivate();

        await _context.SaveChangesAsync(cancellationToken);

        return true;
    }
}
