using MediatR;
using Microsoft.EntityFrameworkCore;
using QuanLyNhaHang.Application.Common.Extensions;
using QuanLyNhaHang.Application.Common.Interfaces;
using QuanLyNhaHang.Application.Features.RestaurantTables.DTOs;

namespace QuanLyNhaHang.Application.Features.RestaurantTables.Queries.GetById;

public class GetRestaurantTableByIdQueryHandler
    : IRequestHandler<GetRestaurantTableByIdQuery, RestaurantTableDto?>
{
    private readonly IApplicationDbContext _context;

    public GetRestaurantTableByIdQueryHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<RestaurantTableDto?> Handle(
        GetRestaurantTableByIdQuery request,
        CancellationToken cancellationToken)
    {
        var query =
            from table in _context.RestaurantTables
                .AsNoTracking()
                .WhereOperational(_context)
            join area in _context.Areas.AsNoTracking() on table.AreaId equals area.Id
            where table.Id == request.Id
            select new RestaurantTableDto
            {
                Id = table.Id,
                AreaId = table.AreaId,
                AreaName = area.Name,
                Name = table.Name,
                Capacity = table.Capacity,
                Status = table.Status,
                Note = table.Note,
                IsActive = table.IsActive,
                CreatedAt = table.CreatedAt,
                UpdatedAt = table.UpdatedAt
            };

        return await query.FirstOrDefaultAsync(cancellationToken);
    }
}