using MediatR;
using QuanLyNhaHang.Application.Features.PromotionUsages.DTOs;

namespace QuanLyNhaHang.Application.Features.PromotionUsages.Queries.GetList;

public class GetPromotionUsagesQuery : IRequest<List<PromotionUsageDto>>
{
    public Guid? PromotionId { get; set; }

    public Guid? OrderId { get; set; }

    public Guid? PaymentId { get; set; }

    public string? PromotionCode { get; set; }

    public string? Status { get; set; }

    public DateTime? FromDate { get; set; }

    public DateTime? ToDate { get; set; }
}