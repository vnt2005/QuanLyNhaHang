namespace QuanLyNhaHang.Application.Features.Ingredients.DTOs;

public class IngredientDto
{
    public Guid Id { get; set; }

    public Guid IngredientCategoryId { get; set; }

    public string IngredientCategoryName { get; set; } = string.Empty;

    public string IngredientCode { get; set; } = string.Empty;

    public string Name { get; set; } = string.Empty;

    public string Unit { get; set; } = string.Empty;

    public decimal CurrentStock { get; set; }

    public decimal MinimumStock { get; set; }

    public decimal CostPrice { get; set; }

    public decimal StockValue { get; set; }

    public bool IsLowStock { get; set; }

    public string? Note { get; set; }

    public bool IsActive { get; set; }

    public DateTime CreatedAt { get; set; }

    public DateTime? UpdatedAt { get; set; }
}