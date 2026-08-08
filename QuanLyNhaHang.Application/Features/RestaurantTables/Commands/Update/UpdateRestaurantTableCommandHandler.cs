using MediatR;
using Microsoft.EntityFrameworkCore;
using QuanLyNhaHang.Application.Common.Interfaces;

namespace QuanLyNhaHang.Application.Features.RestaurantTables.Commands.Update;

public class UpdateRestaurantTableCommandHandler
    : IRequestHandler<UpdateRestaurantTableCommand, bool>
{
    private readonly IApplicationDbContext _context;

    public UpdateRestaurantTableCommandHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<bool> Handle(
        UpdateRestaurantTableCommand request,
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

        var areaExists = await _context.Areas
            .AnyAsync(
                x => x.Id == request.AreaId && x.IsActive,
                cancellationToken);

        if (!areaExists)
        {
            throw new Exception("Khu vực không tồn tại hoặc đã ngừng hoạt động.");
        }

        var name = request.Name.Trim();

        var tableNameExists = await _context.RestaurantTables
            .AnyAsync(
                x => x.AreaId == request.AreaId &&
                     x.Name == name &&
                     x.Id != request.Id &&
                     x.IsActive,
                cancellationToken);

        if (tableNameExists)
        {
            throw new Exception("Tên bàn đã tồn tại trong khu vực này.");
        }

        table.UpdateInfo(
            request.AreaId,
            name,
            request.Capacity,
            request.Note);

        await _context.SaveChangesAsync(cancellationToken);

        return true;
    }
}