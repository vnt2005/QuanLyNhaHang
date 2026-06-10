using MediatR;
using Microsoft.EntityFrameworkCore;
using QuanLyNhaHang.Application.Common.Interfaces;
using QuanLyNhaHang.Application.Features.Ingredients.DTOs;

namespace QuanLyNhaHang.Application.Features.Ingredients.Queries.GetList;

public class GetIngredientsQueryHandler
    : IRequestHandler<GetIngredientsQuery, List<IngredientDto>>
{
    private readonly IApplicationDbContext _context;

    public GetIngredientsQueryHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<List<IngredientDto>> Handle(
        GetIngredientsQuery request,
        CancellationToken cancellationToken)
    {
        var query =
            from ingredient in _context.Ingredients.AsNoTracking()
            join category in _context.IngredientCategories.AsNoTracking()
                on ingredient.IngredientCategoryId equals category.Id into categoryGroup
            from category in categoryGroup.DefaultIfEmpty()
            select new
            {
                Ingredient = ingredient,
                Category = category
            };

        if (request.IngredientCategoryId.HasValue)
        {
            query = query.Where(x =>
                x.Ingredient.IngredientCategoryId == request.IngredientCategoryId.Value);
        }

        if (request.IsActive.HasValue)
        {
            query = query.Where(x =>
                x.Ingredient.IsActive == request.IsActive.Value);
        }

        if (request.IsLowStock.HasValue)
        {
            if (request.IsLowStock.Value)
            {
                query = query.Where(x =>
                    x.Ingredient.CurrentStock <= x.Ingredient.MinimumStock);
            }
            else
            {
                query = query.Where(x =>
                    x.Ingredient.CurrentStock > x.Ingredient.MinimumStock);
            }
        }

        var result = await query
            .OrderByDescending(x => x.Ingredient.CreatedAt)
            .Select(x => new IngredientDto
            {
                Id = x.Ingredient.Id,
                IngredientCategoryId = x.Ingredient.IngredientCategoryId,
                IngredientCategoryName = x.Category != null ? x.Category.Name : string.Empty,
                IngredientCode = x.Ingredient.IngredientCode,
                Name = x.Ingredient.Name,
                Unit = x.Ingredient.Unit,
                CurrentStock = x.Ingredient.CurrentStock,
                MinimumStock = x.Ingredient.MinimumStock,
                CostPrice = x.Ingredient.CostPrice,
                StockValue = x.Ingredient.CurrentStock * x.Ingredient.CostPrice,
                IsLowStock = x.Ingredient.CurrentStock <= x.Ingredient.MinimumStock,
                Note = x.Ingredient.Note,
                IsActive = x.Ingredient.IsActive,
                CreatedAt = x.Ingredient.CreatedAt,
                UpdatedAt = x.Ingredient.UpdatedAt
            })
            .ToListAsync(cancellationToken);

        return result;
    }
}