namespace QuanLyNhaHang.Application.Features.InventoryTransactions.DTOs;

public class InventoryTransactionDto
{
    public Guid Id { get; set; }

    public string TransactionCode { get; set; } = string.Empty;

    public Guid IngredientId { get; set; }

    public string IngredientCode { get; set; } = string.Empty;

    public string IngredientName { get; set; } = string.Empty;

    public string IngredientUnit { get; set; } = string.Empty;

    public string TransactionType { get; set; } = string.Empty;

    public decimal Quantity { get; set; }

    public decimal UnitPrice { get; set; }

    public decimal TotalAmount { get; set; }

    public decimal StockBefore { get; set; }

    public decimal StockAfter { get; set; }

    public string Status { get; set; } = string.Empty;

    public string? Note { get; set; }

    public DateTime TransactionDate { get; set; }

    public DateTime CreatedAt { get; set; }

    public DateTime? CancelledAt { get; set; }
}