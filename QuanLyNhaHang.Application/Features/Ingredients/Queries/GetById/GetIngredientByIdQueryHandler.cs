using MediatR;
using Microsoft.EntityFrameworkCore;
using QuanLyNhaHang.Application.Common.Interfaces;
using QuanLyNhaHang.Application.Features.Ingredients.DTOs;

namespace QuanLyNhaHang.Application.Features.Ingredients.Queries.GetById;

public class GetIngredientByIdQueryHandler
    : IRequestHandler<GetIngredientByIdQuery, IngredientDto?>
{
    private readonly IApplicationDbContext _context;

    public GetIngredientByIdQueryHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<IngredientDto?> Handle(
        GetIngredientByIdQuery request,
        CancellationToken cancellationToken)
    {
        var result = await (
            from ingredient in _context.Ingredients.AsNoTracking()
            join category in _context.IngredientCategories.AsNoTracking()
                on ingredient.IngredientCategoryId equals category.Id into categoryGroup
            from category in categoryGroup.DefaultIfEmpty()
            where ingredient.Id == request.Id
            select new IngredientDto
            {
                Id = ingredient.Id,
                IngredientCategoryId = ingredient.IngredientCategoryId,
                IngredientCategoryName = category != null ? category.Name : string.Empty,
                IngredientCode = ingredient.IngredientCode,
                Name = ingredient.Name,
                Unit = ingredient.Unit,
                CurrentStock = ingredient.CurrentStock,
                MinimumStock = ingredient.MinimumStock,
                CostPrice = ingredient.CostPrice,
                StockValue = ingredient.CurrentStock * ingredient.CostPrice,
                IsLowStock = ingredient.CurrentStock <= ingredient.MinimumStock,
                Note = ingredient.Note,
                IsActive = ingredient.IsActive,
                CreatedAt = ingredient.CreatedAt,
                UpdatedAt = ingredient.UpdatedAt
            })
            .FirstOrDefaultAsync(cancellationToken);

        return result;
    }
}