using MediatR;
using Microsoft.EntityFrameworkCore;
using QuanLyNhaHang.Application.Common.Interfaces;
using QuanLyNhaHang.Application.Features.IngredientCategories.DTOs;

namespace QuanLyNhaHang.Application.Features.IngredientCategories.Commands.Update;

public class UpdateIngredientCategoryCommandHandler
    : IRequestHandler<UpdateIngredientCategoryCommand, IngredientCategoryDto>
{
    private readonly IApplicationDbContext _context;

    public UpdateIngredientCategoryCommandHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<IngredientCategoryDto> Handle(
        UpdateIngredientCategoryCommand request,
        CancellationToken cancellationToken)
    {
        var category = await _context.IngredientCategories
            .FirstOrDefaultAsync(x => x.Id == request.Id, cancellationToken);

        if (category == null)
            throw new Exception("Không tìm thấy danh mục nguyên liệu.");

        var name = request.Name.Trim();

        var existedCategory = await _context.IngredientCategories
            .AnyAsync(x =>
                x.Id != request.Id &&
                x.Name == name,
                cancellationToken);

        if (existedCategory)
            throw new Exception("Tên danh mục nguyên liệu đã tồn tại.");

        category.UpdateInfo(
            request.Name,
            request.Description);

        if (request.IsActive)
            category.Activate();
        else
            category.Deactivate();

        await _context.SaveChangesAsync(cancellationToken);

        return new IngredientCategoryDto
        {
            Id = category.Id,
            Name = category.Name,
            Description = category.Description,
            IsActive = category.IsActive,
            CreatedAt = category.CreatedAt,
            UpdatedAt = category.UpdatedAt
        };
    }
}