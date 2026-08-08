using MediatR;
using Microsoft.EntityFrameworkCore;
using QuanLyNhaHang.Application.Common.Interfaces;
using QuanLyNhaHang.Domain.Entities;

namespace QuanLyNhaHang.Application.Features.RestaurantTables.Commands.Create;

public class CreateRestaurantTableCommandHandler
    : IRequestHandler<CreateRestaurantTableCommand, Guid>
{
    private readonly IApplicationDbContext _context;

    public CreateRestaurantTableCommandHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<Guid> Handle(
        CreateRestaurantTableCommand request,
        CancellationToken cancellationToken)
    {
        var areaExists = await _context.Areas
            .AnyAsync(
                x => x.Id == request.AreaId && x.IsActive,
                cancellationToken);

        if (!areaExists)
        {
            throw new Exception("Khu vực không tồn tại hoặc đã ngừng hoạt động.");
        }

        var name = request.Name.Trim();

        var tableExists = await _context.RestaurantTables
            .AnyAsync(
                x => x.AreaId == request.AreaId &&
                     x.Name == name &&
                     x.IsActive,
                cancellationToken);

        if (tableExists)
        {
            throw new Exception("Tên bàn đã tồn tại trong khu vực này.");
        }

        var table = new RestaurantTable(
            request.AreaId,
            name,
            request.Capacity,
            request.Note);

        _context.RestaurantTables.Add(table);

        await _context.SaveChangesAsync(cancellationToken);

        return table.Id;
    }
}