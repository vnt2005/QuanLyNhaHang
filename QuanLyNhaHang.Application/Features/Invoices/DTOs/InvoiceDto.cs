namespace QuanLyNhaHang.Application.Features.Invoices.DTOs;

public class InvoiceDto
{
    public Guid Id { get; set; }

    public Guid OrderId { get; set; }

    public Guid PaymentId { get; set; }

    public Guid? RestaurantTableId { get; set; }

    public string InvoiceCode { get; set; } = string.Empty;

    public string OrderCode { get; set; } = string.Empty;

    public string PaymentCode { get; set; } = string.Empty;

    public string RestaurantTableName { get; set; } = string.Empty;

    public decimal TotalAmount { get; set; }

    public decimal DiscountAmount { get; set; }

    public decimal ServiceChargeAmount { get; set; }

    public decimal VatAmount { get; set; }

    public decimal FinalAmount { get; set; }

    public decimal CustomerPaid { get; set; }

    public decimal ChangeAmount { get; set; }

    public string PaymentMethod { get; set; } = string.Empty;

    public string Status { get; set; } = string.Empty;

    public string? Note { get; set; }

    public DateTime IssuedAt { get; set; }

    public DateTime CreatedAt { get; set; }

    public DateTime? UpdatedAt { get; set; }

    public List<InvoiceItemDto> Items { get; set; } = new();
}