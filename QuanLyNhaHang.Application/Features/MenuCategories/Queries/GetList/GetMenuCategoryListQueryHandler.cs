using MediatR;
using Microsoft.EntityFrameworkCore;
using QuanLyNhaHang.Application.Common.Interfaces;
using QuanLyNhaHang.Application.Features.MenuCategories.DTOs;

namespace QuanLyNhaHang.Application.Features.MenuCategories.Queries.GetList;

public class GetMenuCategoryListQueryHandler
    : IRequestHandler<GetMenuCategoryListQuery, List<MenuCategoryDto>>
{
    private readonly IApplicationDbContext _context;

    public GetMenuCategoryListQueryHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<List<MenuCategoryDto>> Handle(
        GetMenuCategoryListQuery request,
        CancellationToken cancellationToken)
    {
        return await _context.MenuCategories
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
            })
            .ToListAsync(cancellationToken);
    }
}