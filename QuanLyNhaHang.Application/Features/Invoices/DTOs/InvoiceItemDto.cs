namespace QuanLyNhaHang.Application.Features.Invoices.DTOs;

public class InvoiceItemDto
{
    public Guid Id { get; set; }

    public Guid InvoiceId { get; set; }

    public Guid OrderItemId { get; set; }

    public Guid MenuItemId { get; set; }

    public string MenuItemName { get; set; } = string.Empty;

    public int Quantity { get; set; }

    public decimal UnitPrice { get; set; }

    public decimal TotalPrice { get; set; }

    public string? Note { get; set; }

    public DateTime CreatedAt { get; set; }
}