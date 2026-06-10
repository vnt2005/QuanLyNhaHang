using MediatR;
using QuanLyNhaHang.Application.Features.IngredientCategories.DTOs;

namespace QuanLyNhaHang.Application.Features.IngredientCategories.Commands.Update;

public class UpdateIngredientCategoryCommand : IRequest<IngredientCategoryDto>
{
    public Guid Id { get; set; }

    public string Name { get; set; } = string.Empty;

    public string? Description { get; set; }

    public bool IsActive { get; set; } = true;
}