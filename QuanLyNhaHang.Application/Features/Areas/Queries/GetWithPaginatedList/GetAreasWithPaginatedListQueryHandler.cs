using MediatR;
using Microsoft.EntityFrameworkCore;
using QuanLyNhaHang.Application.Common.Interfaces;
using QuanLyNhaHang.Application.Common.Models;
using QuanLyNhaHang.Application.Features.Areas.DTOs;

namespace QuanLyNhaHang.Application.Features.Areas.Queries.GetWithPaginatedList;

public class GetAreasWithPaginatedListQueryHandler
    : IRequestHandler<GetAreasWithPaginatedListQuery, PaginatedList<AreaDto>>
{
    private readonly IApplicationDbContext _context;

    public GetAreasWithPaginatedListQueryHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<PaginatedList<AreaDto>> Handle(
        GetAreasWithPaginatedListQuery request,
        CancellationToken cancellationToken)
    {
        var query = _context.Areas
            .AsNoTracking()
            .AsQueryable();

        if (!string.IsNullOrWhiteSpace(request.Keyword))
        {
            var keyword = request.Keyword.Trim().ToLower();

            query = query.Where(x =>
                x.Name.ToLower().Contains(keyword) ||
                (x.Description != null &&
                 x.Description.ToLower().Contains(keyword)));
        }

        var pageNumber = request.PageNumber <= 0 ? 1 : request.PageNumber;
        var pageSize = request.PageSize <= 0 ? 10 : request.PageSize;

        var projectedQuery = query
            .OrderByDescending(x => x.CreatedAt)
            .Select(x => new AreaDto
            {
                Id = x.Id,
                Name = x.Name,
                Description = x.Description,
                IsActive = x.IsActive,
                CreatedAt = x.CreatedAt,
                UpdatedAt = x.UpdatedAt
            });

        return await PaginatedList<AreaDto>.CreateAsync(
            projectedQuery,
            pageNumber,
            pageSize,
            cancellationToken);
    }
}
