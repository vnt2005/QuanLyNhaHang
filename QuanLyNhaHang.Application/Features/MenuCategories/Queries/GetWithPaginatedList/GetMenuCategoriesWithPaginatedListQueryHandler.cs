using MediatR;
using Microsoft.EntityFrameworkCore;
using QuanLyNhaHang.Application.Common.Interfaces;
using QuanLyNhaHang.Application.Common.Models;
using QuanLyNhaHang.Application.Features.MenuCategories.DTOs;

namespace QuanLyNhaHang.Application.Features.MenuCategories.Queries.GetWithPaginatedList;

public class GetMenuCategoriesWithPaginatedListQueryHandler
    : IRequestHandler<GetMenuCategoriesWithPaginatedListQuery, PaginatedList<MenuCategoryDto>>
{
    private readonly IApplicationDbContext _context;

    public GetMenuCategoriesWithPaginatedListQueryHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<PaginatedList<MenuCategoryDto>> Handle(
        GetMenuCategoriesWithPaginatedListQuery request,
        CancellationToken cancellationToken)
    {
        var query = _context.MenuCategories.AsNoTracking();

        if (!string.IsNullOrWhiteSpace(request.Keyword))
        {
            var keyword = request.Keyword.Trim().ToLower();

            query = query.Where(x =>
                x.Name.ToLower().Contains(keyword) ||
                (x.Description != null &&
                 x.Description.ToLower().Contains(keyword)));
        }

        if (request.IsActive.HasValue)
        {
            query = query.Where(x => x.IsActive == request.IsActive.Value);
        }

        var pageNumber = request.PageNumber <= 0 ? 1 : request.PageNumber;
        var pageSize = request.PageSize <= 0 ? 10 : request.PageSize;

        var projectedQuery = query
            .OrderBy(x => x.DisplayOrder)
            .ThenByDescending(x => x.CreatedAt)
            .Select(x => new MenuCategoryDto
            {
                Id = x.Id,
                Name = x.Name,
                Description = x.Description,
                DisplayOrder = x.DisplayOrder,
                IsActive = x.IsActive,
                CreatedAt = x.CreatedAt,
                UpdatedAt = x.UpdatedAt
            });

        return await PaginatedList<MenuCategoryDto>.CreateAsync(
            projectedQuery,
            pageNumber,
            pageSize,
            cancellationToken);
    }
}
