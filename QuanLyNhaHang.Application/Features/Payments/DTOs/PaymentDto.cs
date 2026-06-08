namespace QuanLyNhaHang.Application.Features.Payments.DTOs;

public class PaymentDto
{
    public Guid Id { get; set; }

    public Guid OrderId { get; set; }

    public string PaymentCode { get; set; } = string.Empty;

    public decimal TotalAmount { get; set; }

    public decimal DiscountAmount { get; set; }

    public decimal VatAmount { get; set; }

    public decimal FinalAmount { get; set; }

    public decimal CustomerPaid { get; set; }

    public decimal ChangeAmount { get; set; }

    public string PaymentMethod { get; set; } = string.Empty;

    public string Status { get; set; } = string.Empty;

    public string? Note { get; set; }

    public DateTime PaidAt { get; set; }

    public DateTime CreatedAt { get; set; }

    public DateTime? UpdatedAt { get; set; }
}