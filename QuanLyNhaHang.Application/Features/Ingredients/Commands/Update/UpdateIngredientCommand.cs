using MediatR;
using QuanLyNhaHang.Application.Features.Ingredients.DTOs;

namespace QuanLyNhaHang.Application.Features.Ingredients.Commands.Update;

public class UpdateIngredientCommand : IRequest<IngredientDto>
{
    public Guid Id { get; set; }

    public Guid IngredientCategoryId { get; set; }

    public string Name { get; set; } = string.Empty;

    public string Unit { get; set; } = string.Empty;

    public decimal MinimumStock { get; set; }

    public decimal CostPrice { get; set; }

    public string? Note { get; set; }

    public bool IsActive { get; set; } = true;
}