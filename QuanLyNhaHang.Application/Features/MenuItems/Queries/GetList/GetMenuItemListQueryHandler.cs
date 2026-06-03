using MediatR;
using Microsoft.EntityFrameworkCore;
using QuanLyNhaHang.Application.Common.Interfaces;
using QuanLyNhaHang.Application.Features.MenuItems.DTOs;

namespace QuanLyNhaHang.Application.Features.MenuItems.Queries.GetList;

public class GetMenuItemListQueryHandler
    : IRequestHandler<GetMenuItemListQuery, List<MenuItemDto>>
{
    private readonly IApplicationDbContext _context;

    public GetMenuItemListQueryHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<List<MenuItemDto>> Handle(
        GetMenuItemListQuery request,
        CancellationToken cancellationToken)
    {
        var query =
            from item in _context.MenuItems
            join category in _context.MenuCategories
                on item.MenuCategoryId equals category.Id
            orderby item.CreatedAt descending
            select new MenuItemDto
            {
                Id = item.Id,
                MenuCategoryId = item.MenuCategoryId,
                MenuCategoryName = category.Name,
                Name = item.Name,
                Description = item.Description,
                Price = item.Price,
                ImageUrl = item.ImageUrl,
                IsAvailable = item.IsAvailable,
                IsActive = item.IsActive,
                CreatedAt = item.CreatedAt,
                UpdatedAt = item.UpdatedAt
            };

        return await query.ToListAsync(cancellationToken);
    }
}