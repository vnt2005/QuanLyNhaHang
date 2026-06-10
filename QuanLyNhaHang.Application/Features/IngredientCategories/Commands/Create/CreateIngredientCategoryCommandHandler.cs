using MediatR;
using Microsoft.EntityFrameworkCore;
using QuanLyNhaHang.Application.Common.Interfaces;
using QuanLyNhaHang.Application.Features.IngredientCategories.DTOs;
using QuanLyNhaHang.Domain.Entities;

namespace QuanLyNhaHang.Application.Features.IngredientCategories.Commands.Create;

public class CreateIngredientCategoryCommandHandler
    : IRequestHandler<CreateIngredientCategoryCommand, IngredientCategoryDto>
{
    private readonly IApplicationDbContext _context;

    public CreateIngredientCategoryCommandHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<IngredientCategoryDto> Handle(
        CreateIngredientCategoryCommand request,
        CancellationToken cancellationToken)
    {
        var name = request.Name.Trim();

        var existedCategory = await _context.IngredientCategories
            .AnyAsync(x => x.Name == name, cancellationToken);

        if (existedCategory)
            throw new Exception("Tên danh mục nguyên liệu đã tồn tại.");

        var category = new IngredientCategory(
            request.Name,
            request.Description);

        await _context.IngredientCategories.AddAsync(category, cancellationToken);

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