using MediatR;
using QuanLyNhaHang.Application.Features.Promotions.DTOs;

namespace QuanLyNhaHang.Application.Features.Promotions.Commands.Update;

public class UpdatePromotionCommand : IRequest<PromotionDto>
{
    public Guid Id { get; set; }

    public string Name { get; set; } = string.Empty;

    public string? Description { get; set; }

    public string DiscountType { get; set; } = string.Empty;

    public decimal DiscountValue { get; set; }

    public decimal MinimumOrderAmount { get; set; }

    public decimal? MaximumDiscountAmount { get; set; }

    public DateTime StartDate { get; set; }

    public DateTime EndDate { get; set; }

    public int? UsageLimit { get; set; }

    public bool IsActive { get; set; } = true;
}