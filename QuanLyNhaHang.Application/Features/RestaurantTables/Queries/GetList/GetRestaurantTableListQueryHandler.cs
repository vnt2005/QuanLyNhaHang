using MediatR;
using Microsoft.EntityFrameworkCore;
using QuanLyNhaHang.Application.Common.Interfaces;
using QuanLyNhaHang.Application.Features.RestaurantTables.DTOs;

namespace QuanLyNhaHang.Application.Features.RestaurantTables.Queries.GetList;

public class GetRestaurantTableListQueryHandler
    : IRequestHandler<GetRestaurantTableListQuery, List<RestaurantTableDto>>
{
    private readonly IApplicationDbContext _context;

    public GetRestaurantTableListQueryHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<List<RestaurantTableDto>> Handle(
        GetRestaurantTableListQuery request,
        CancellationToken cancellationToken)
    {
        var query =
            from table in _context.RestaurantTables
            join area in _context.Areas on table.AreaId equals area.Id
            where table.IsActive && area.IsActive
            orderby table.CreatedAt descending
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

        return await query.ToListAsync(cancellationToken);
    }
}