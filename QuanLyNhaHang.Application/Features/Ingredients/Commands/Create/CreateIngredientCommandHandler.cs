using MediatR;
using Microsoft.EntityFrameworkCore;
using QuanLyNhaHang.Application.Common.Interfaces;
using QuanLyNhaHang.Application.Features.Ingredients.DTOs;
using QuanLyNhaHang.Domain.Entities;

namespace QuanLyNhaHang.Application.Features.Ingredients.Commands.Create;

public class CreateIngredientCommandHandler
    : IRequestHandler<CreateIngredientCommand, IngredientDto>
{
    private readonly IApplicationDbContext _context;

    public CreateIngredientCommandHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<IngredientDto> Handle(
        CreateIngredientCommand request,
        CancellationToken cancellationToken)
    {
        var category = await _context.IngredientCategories
            .AsNoTracking()
            .FirstOrDefaultAsync(x =>
                x.Id == request.IngredientCategoryId &&
                x.IsActive,
                cancellationToken);

        if (category == null)
            throw new Exception("Không tìm thấy danh mục nguyên liệu hoặc danh mục đã bị vô hiệu hóa.");

        var ingredientCode = request.IngredientCode.Trim().ToUpper();

        var existedIngredient = await _context.Ingredients
            .AnyAsync(x => x.IngredientCode == ingredientCode, cancellationToken);

        if (existedIngredient)
            throw new Exception("Mã nguyên liệu đã tồn tại.");

        var ingredient = new Ingredient(
            request.IngredientCategoryId,
            request.IngredientCode,
            request.Name,
            request.Unit,
            request.CurrentStock,
            request.MinimumStock,
            request.CostPrice,
            request.Note);

        await _context.Ingredients.AddAsync(ingredient, cancellationToken);

        await _context.SaveChangesAsync(cancellationToken);

        return new IngredientDto
        {
            Id = ingredient.Id,
            IngredientCategoryId = ingredient.IngredientCategoryId,
            IngredientCategoryName = category.Name,
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
        };
    }
}