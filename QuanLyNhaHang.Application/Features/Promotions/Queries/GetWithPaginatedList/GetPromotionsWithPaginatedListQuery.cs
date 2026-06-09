using MediatR;
using QuanLyNhaHang.Application.Common.Models;
using QuanLyNhaHang.Application.Features.Promotions.DTOs;

namespace QuanLyNhaHang.Application.Features.Promotions.Queries.GetWithPaginatedList;

public class GetPromotionsWithPaginatedListQuery
    : IRequest<PaginatedList<PromotionDto>>
{
    public string? Keyword { get; set; }

    public string? DiscountType { get; set; }

    public bool? IsActive { get; set; }

    public bool? IsValidNow { get; set; }

    public int PageNumber { get; set; } = 1;

    public int PageSize { get; set; } = 10;
}