using MediatR;
using Microsoft.EntityFrameworkCore;
using QuanLyNhaHang.Application.Common.Interfaces;
using QuanLyNhaHang.Application.Features.MenuItems.DTOs;

namespace QuanLyNhaHang.Application.Features.MenuItems.Queries.GetById;

public class GetMenuItemByIdQueryHandler
    : IRequestHandler<GetMenuItemByIdQuery, MenuItemDto?>
{
    private readonly IApplicationDbContext _context;

    public GetMenuItemByIdQueryHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<MenuItemDto?> Handle(
        GetMenuItemByIdQuery request,
        CancellationToken cancellationToken)
    {
        var query =
            from item in _context.MenuItems
            join category in _context.MenuCategories
                on item.MenuCategoryId equals category.Id
            where item.Id == request.Id
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

        return await query.FirstOrDefaultAsync(cancellationToken);
    }
}