using MediatR;
using Microsoft.EntityFrameworkCore;
using QuanLyNhaHang.Application.Common.Interfaces;
using QuanLyNhaHang.Application.Features.MenuCategories.DTOs;

namespace QuanLyNhaHang.Application.Features.MenuCategories.Queries.GetById;

public class GetMenuCategoryByIdQueryHandler
    : IRequestHandler<GetMenuCategoryByIdQuery, MenuCategoryDto?>
{
    private readonly IApplicationDbContext _context;

    public GetMenuCategoryByIdQueryHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<MenuCategoryDto?> Handle(
        GetMenuCategoryByIdQuery request,
        CancellationToken cancellationToken)
    {
        return await _context.MenuCategories
            .Where(x => x.Id == request.Id)
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
            .FirstOrDefaultAsync(cancellationToken);
    }
}