using MediatR;
using QuanLyNhaHang.Application.Common.Models;
using QuanLyNhaHang.Application.Features.PromotionUsages.DTOs;

namespace QuanLyNhaHang.Application.Features.PromotionUsages.Queries.GetWithPaginatedList;

public class GetPromotionUsagesWithPaginatedListQuery
    : IRequest<PaginatedList<PromotionUsageDto>>
{
    public string? Keyword { get; set; }

    public Guid? PromotionId { get; set; }

    public Guid? OrderId { get; set; }

    public Guid? PaymentId { get; set; }

    public string? Status { get; set; }

    public DateTime? FromDate { get; set; }

    public DateTime? ToDate { get; set; }

    public int PageNumber { get; set; } = 1;

    public int PageSize { get; set; } = 10;
}