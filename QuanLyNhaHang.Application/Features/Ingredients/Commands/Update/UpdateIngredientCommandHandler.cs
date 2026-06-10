using MediatR;
using Microsoft.EntityFrameworkCore;
using QuanLyNhaHang.Application.Common.Interfaces;
using QuanLyNhaHang.Application.Features.Ingredients.DTOs;

namespace QuanLyNhaHang.Application.Features.Ingredients.Commands.Update;

public class UpdateIngredientCommandHandler
    : IRequestHandler<UpdateIngredientCommand, IngredientDto>
{
    private readonly IApplicationDbContext _context;

    public UpdateIngredientCommandHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<IngredientDto> Handle(
        UpdateIngredientCommand request,
        CancellationToken cancellationToken)
    {
        var ingredient = await _context.Ingredients
            .FirstOrDefaultAsync(x => x.Id == request.Id, cancellationToken);

        if (ingredient == null)
            throw new Exception("Không tìm thấy nguyên liệu.");

        var category = await _context.IngredientCategories
            .AsNoTracking()
            .FirstOrDefaultAsync(x =>
                x.Id == request.IngredientCategoryId &&
                x.IsActive,
                cancellationToken);

        if (category == null)
            throw new Exception("Không tìm thấy danh mục nguyên liệu hoặc danh mục đã bị vô hiệu hóa.");

        ingredient.UpdateInfo(
            request.IngredientCategoryId,
            request.Name,
            request.Unit,
            request.MinimumStock,
            request.CostPrice,
            request.Note);

        if (request.IsActive)
            ingredient.Activate();
        else
            ingredient.Deactivate();

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