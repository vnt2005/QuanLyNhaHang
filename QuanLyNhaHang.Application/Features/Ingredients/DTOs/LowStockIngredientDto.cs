namespace QuanLyNhaHang.Application.Features.Ingredients.DTOs;

public class LowStockIngredientDto
{
    public Guid Id { get; set; }

    public string IngredientCode { get; set; } = string.Empty;

    public string Name { get; set; } = string.Empty;

    public string IngredientCategoryName { get; set; } = string.Empty;

    public string Unit { get; set; } = string.Empty;

    public decimal CurrentStock { get; set; }

    public decimal MinimumStock { get; set; }

    public decimal MissingQuantity { get; set; }

    public string? Note { get; set; }
}