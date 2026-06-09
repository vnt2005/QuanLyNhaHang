namespace QuanLyNhaHang.Application.Features.QrOrders.DTOs;

public class QrOrderItemDto
{
    public Guid Id { get; set; }

    public Guid MenuItemId { get; set; }

    public string MenuItemName { get; set; } = string.Empty;

    public int Quantity { get; set; }

    public decimal UnitPrice { get; set; }

    public decimal TotalPrice { get; set; }

    public string Status { get; set; } = string.Empty;

    public string? Note { get; set; }
}