using MediatR;
using Microsoft.EntityFrameworkCore;
using QuanLyNhaHang.Application.Common.Interfaces;
using QuanLyNhaHang.Application.Common.Models;
using QuanLyNhaHang.Application.Features.Ingredients.DTOs;

namespace QuanLyNhaHang.Application.Features.Ingredients.Queries.GetWithPaginatedList;

public class GetIngredientsWithPaginatedListQueryHandler
    : IRequestHandler<GetIngredientsWithPaginatedListQuery, PaginatedList<IngredientDto>>
{
    private readonly IApplicationDbContext _context;

    public GetIngredientsWithPaginatedListQueryHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<PaginatedList<IngredientDto>> Handle(
        GetIngredientsWithPaginatedListQuery request,
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

        if (!string.IsNullOrWhiteSpace(request.Keyword))
        {
            var keyword = request.Keyword.Trim();

            query = query.Where(x =>
                x.Ingredient.IngredientCode.Contains(keyword) ||
                x.Ingredient.Name.Contains(keyword) ||
                x.Ingredient.Unit.Contains(keyword) ||
                (x.Ingredient.Note != null && x.Ingredient.Note.Contains(keyword)) ||
                (x.Category != null && x.Category.Name.Contains(keyword)));
        }

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

        var ingredientDtos = query
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
            });

        return await PaginatedList<IngredientDto>.CreateAsync(
            ingredientDtos,
            request.PageNumber,
            request.PageSize);
    }
}