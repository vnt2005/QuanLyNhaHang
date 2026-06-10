namespace QuanLyNhaHang.Application.Features.Dashboard.DTOs;

public class DashboardLowStockIngredientDto
{
    public Guid IngredientId { get; set; }

    public string IngredientCode { get; set; } = string.Empty;

    public string IngredientName { get; set; } = string.Empty;

    public string Unit { get; set; } = string.Empty;

    public decimal CurrentStock { get; set; }

    public decimal MinimumStock { get; set; }

    public decimal MissingQuantity { get; set; }
}