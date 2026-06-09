namespace QuanLyNhaHang.Application.Features.PromotionUsages.DTOs;

public class PromotionUsageDto
{
    public Guid Id { get; set; }

    public Guid PromotionId { get; set; }

    public string PromotionCode { get; set; } = string.Empty;

    public string PromotionName { get; set; } = string.Empty;

    public Guid OrderId { get; set; }

    public string OrderCode { get; set; } = string.Empty;

    public Guid? PaymentId { get; set; }

    public string? PaymentCode { get; set; }

    public decimal OrderAmount { get; set; }

    public decimal DiscountAmount { get; set; }

    public string Status { get; set; } = string.Empty;

    public string? Note { get; set; }

    public DateTime UsedAt { get; set; }

    public DateTime? CancelledAt { get; set; }
}