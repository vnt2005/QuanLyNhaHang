using MediatR;
using QuanLyNhaHang.Application.Features.IngredientCategories.DTOs;

namespace QuanLyNhaHang.Application.Features.IngredientCategories.Commands.Create;

public class CreateIngredientCategoryCommand : IRequest<IngredientCategoryDto>
{
    public string Name { get; set; } = string.Empty;

    public string? Description { get; set; }
}