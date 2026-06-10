using MediatR;
using QuanLyNhaHang.Application.Features.Ingredients.DTOs;

namespace QuanLyNhaHang.Application.Features.Ingredients.Commands.Create;

public class CreateIngredientCommand : IRequest<IngredientDto>
{
    public Guid IngredientCategoryId { get; set; }

    public string IngredientCode { get; set; } = string.Empty;

    public string Name { get; set; } = string.Empty;

    public string Unit { get; set; } = string.Empty;

    public decimal CurrentStock { get; set; }

    public decimal MinimumStock { get; set; }

    public decimal CostPrice { get; set; }

    public string? Note { get; set; }
}