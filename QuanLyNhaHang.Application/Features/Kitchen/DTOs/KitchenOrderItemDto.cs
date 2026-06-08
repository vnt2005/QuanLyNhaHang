namespace QuanLyNhaHang.Application.Features.Kitchen.Dtos;

public class KitchenOrderItemDto
{
    public Guid OrderItemId { get; set; }

    public Guid MenuItemId { get; set; }

    public string MenuItemName { get; set; } = string.Empty;

    public int Quantity { get; set; }

    public decimal UnitPrice { get; set; }

    public decimal TotalPrice { get; set; }

    public string Status { get; set; } = string.Empty;

    public string? Note { get; set; }

    public DateTime CreatedAt { get; set; }

    public DateTime? UpdatedAt { get; set; }

    public DateTime? StartedAt { get; set; }

    public DateTime? CompletedAt { get; set; }
}