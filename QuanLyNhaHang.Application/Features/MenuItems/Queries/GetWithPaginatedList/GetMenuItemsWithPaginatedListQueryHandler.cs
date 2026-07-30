using MediatR;
using Microsoft.EntityFrameworkCore;
using QuanLyNhaHang.Application.Common.Interfaces;
using QuanLyNhaHang.Application.Common.Models;
using QuanLyNhaHang.Application.Features.MenuItems.DTOs;

namespace QuanLyNhaHang.Application.Features.MenuItems.Queries.GetWithPaginatedList;

public class GetMenuItemsWithPaginatedListQueryHandler
    : IRequestHandler<GetMenuItemsWithPaginatedListQuery, PaginatedList<MenuItemDto>>
{
    private readonly IApplicationDbContext _context;

    public GetMenuItemsWithPaginatedListQueryHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<PaginatedList<MenuItemDto>> Handle(
        GetMenuItemsWithPaginatedListQuery request,
        CancellationToken cancellationToken)
    {
        var query =
            from item in _context.MenuItems.AsNoTracking()
            join category in _context.MenuCategories.AsNoTracking()
                on item.MenuCategoryId equals category.Id
            select new
            {
                Item = item,
                CategoryName = category.Name
            };

        if (!string.IsNullOrWhiteSpace(request.Keyword))
        {
            var keyword = request.Keyword.Trim().ToLower();

            query = query.Where(x =>
                x.Item.Name.ToLower().Contains(keyword) ||
                x.CategoryName.ToLower().Contains(keyword) ||
                (x.Item.Description != null &&
                 x.Item.Description.ToLower().Contains(keyword)));
        }

        if (request.MenuCategoryId.HasValue)
        {
            query = query.Where(x =>
                x.Item.MenuCategoryId == request.MenuCategoryId.Value);
        }

        if (request.IsAvailable.HasValue)
        {
            query = query.Where(x =>
                x.Item.IsAvailable == request.IsAvailable.Value);
        }

        if (request.IsActive.HasValue)
        {
            query = query.Where(x =>
                x.Item.IsActive == request.IsActive.Value);
        }

        var pageNumber = request.PageNumber <= 0 ? 1 : request.PageNumber;
        var pageSize = request.PageSize <= 0 ? 10 : request.PageSize;

        var projectedQuery = query
            .OrderByDescending(x => x.Item.CreatedAt)
            .Select(x => new MenuItemDto
            {
                Id = x.Item.Id,
                MenuCategoryId = x.Item.MenuCategoryId,
                MenuCategoryName = x.CategoryName,
                Name = x.Item.Name,
                Description = x.Item.Description,
                Price = x.Item.Price,
                ImageUrl = x.Item.ImageUrl,
                IsAvailable = x.Item.IsAvailable,
                IsActive = x.Item.IsActive,
                CreatedAt = x.Item.CreatedAt,
                UpdatedAt = x.Item.UpdatedAt
            });

        return await PaginatedList<MenuItemDto>.CreateAsync(
            projectedQuery,
            pageNumber,
            pageSize,
            cancellationToken);
    }
}
