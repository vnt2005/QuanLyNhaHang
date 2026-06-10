using MediatR;
using Microsoft.EntityFrameworkCore;
using QuanLyNhaHang.Application.Common.Interfaces;
using QuanLyNhaHang.Application.Features.IngredientCategories.DTOs;

namespace QuanLyNhaHang.Application.Features.IngredientCategories.Queries.GetList;

public class GetIngredientCategoriesQueryHandler
    : IRequestHandler<GetIngredientCategoriesQuery, List<IngredientCategoryDto>>
{
    private readonly IApplicationDbContext _context;

    public GetIngredientCategoriesQueryHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<List<IngredientCategoryDto>> Handle(
        GetIngredientCategoriesQuery request,
        CancellationToken cancellationToken)
    {
        var query = _context.IngredientCategories
            .AsNoTracking()
            .AsQueryable();

        if (request.IsActive.HasValue)
        {
            query = query.Where(x => x.IsActive == request.IsActive.Value);
        }

        var result = await query
            .OrderByDescending(x => x.CreatedAt)
            .Select(x => new IngredientCategoryDto
            {
                Id = x.Id,
                Name = x.Name,
                Description = x.Description,
                IsActive = x.IsActive,
                CreatedAt = x.CreatedAt,
                UpdatedAt = x.UpdatedAt
            })
            .ToListAsync(cancellationToken);

        return result;
    }
}