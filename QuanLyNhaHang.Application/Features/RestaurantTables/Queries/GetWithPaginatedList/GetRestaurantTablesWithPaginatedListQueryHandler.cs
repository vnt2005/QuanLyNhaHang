using MediatR;
using Microsoft.EntityFrameworkCore;
using QuanLyNhaHang.Application.Common.Interfaces;
using QuanLyNhaHang.Application.Features.RestaurantTables.DTOs;

namespace QuanLyNhaHang.Application.Features.RestaurantTables.Queries.GetWithPaginatedList;

public class GetRestaurantTablesWithPaginatedListQueryHandler
    : IRequestHandler<GetRestaurantTablesWithPaginatedListQuery, List<RestaurantTableDto>>
{
    private readonly IApplicationDbContext _context;

    public GetRestaurantTablesWithPaginatedListQueryHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<List<RestaurantTableDto>> Handle(
        GetRestaurantTablesWithPaginatedListQuery request,
        CancellationToken cancellationToken)
    {
        var query =
            from table in _context.RestaurantTables
            join area in _context.Areas on table.AreaId equals area.Id
            select new
            {
                Table = table,
                AreaName = area.Name
            };

        if (!string.IsNullOrWhiteSpace(request.Keyword))
        {
            var keyword = request.Keyword.Trim().ToLower();

            query = query.Where(x =>
                x.Table.Name.ToLower().Contains(keyword) ||
                x.AreaName.ToLower().Contains(keyword) ||
                (x.Table.Note != null &&
                 x.Table.Note.ToLower().Contains(keyword)));
        }

        if (request.AreaId.HasValue)
        {
            query = query.Where(x => x.Table.AreaId == request.AreaId.Value);
        }

        if (!string.IsNullOrWhiteSpace(request.Status))
        {
            var status = request.Status.Trim();

            query = query.Where(x => x.Table.Status == status);
        }

        var pageNumber = request.PageNumber <= 0 ? 1 : request.PageNumber;
        var pageSize = request.PageSize <= 0 ? 10 : request.PageSize;

        return await query
            .OrderByDescending(x => x.Table.CreatedAt)
            .Skip((pageNumber - 1) * pageSize)
            .Take(pageSize)
            .Select(x => new RestaurantTableDto
            {
                Id = x.Table.Id,
                AreaId = x.Table.AreaId,
                AreaName = x.AreaName,
                Name = x.Table.Name,
                Capacity = x.Table.Capacity,
                Status = x.Table.Status,
                Note = x.Table.Note,
                IsActive = x.Table.IsActive,
                CreatedAt = x.Table.CreatedAt,
                UpdatedAt = x.Table.UpdatedAt
            })
            .ToListAsync(cancellationToken);
    }
}