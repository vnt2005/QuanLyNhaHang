namespace QuanLyNhaHang.Application.Features.Promotions.DTOs;

public class ApplyPromotionResultDto
{
    public Guid PromotionId { get; set; }

    public string PromotionCode { get; set; } = string.Empty;

    public string PromotionName { get; set; } = string.Empty;

    public string DiscountType { get; set; } = string.Empty;

    public decimal DiscountValue { get; set; }

    public decimal OrderAmount { get; set; }

    public decimal DiscountAmount { get; set; }

    public decimal FinalAmount { get; set; }

    public Guid PromotionUsageId { get; set; }

    public Guid OrderId { get; set; }

    public string? Note { get; set; }
}