using MediatR;
using Microsoft.EntityFrameworkCore;
using QuanLyNhaHang.Application.Common.Interfaces;
using QuanLyNhaHang.Application.Features.Ingredients.DTOs;

namespace QuanLyNhaHang.Application.Features.Ingredients.Queries.GetList;

public class GetLowStockIngredientsQueryHandler
    : IRequestHandler<GetLowStockIngredientsQuery, List<LowStockIngredientDto>>
{
    private readonly IApplicationDbContext _context;

    public GetLowStockIngredientsQueryHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<List<LowStockIngredientDto>> Handle(
        GetLowStockIngredientsQuery request,
        CancellationToken cancellationToken)
    {
        var result = await (
            from ingredient in _context.Ingredients.AsNoTracking()
            join category in _context.IngredientCategories.AsNoTracking()
                on ingredient.IngredientCategoryId equals category.Id into categoryGroup
            from category in categoryGroup.DefaultIfEmpty()
            where ingredient.IsActive &&
                  ingredient.CurrentStock <= ingredient.MinimumStock
            orderby ingredient.CurrentStock ascending
            select new LowStockIngredientDto
            {
                Id = ingredient.Id,
                IngredientCode = ingredient.IngredientCode,
                Name = ingredient.Name,
                IngredientCategoryName = category != null ? category.Name : string.Empty,
                Unit = ingredient.Unit,
                CurrentStock = ingredient.CurrentStock,
                MinimumStock = ingredient.MinimumStock,
                MissingQuantity = ingredient.MinimumStock - ingredient.CurrentStock,
                Note = ingredient.Note
            })
            .ToListAsync(cancellationToken);

        return result;
    }
}