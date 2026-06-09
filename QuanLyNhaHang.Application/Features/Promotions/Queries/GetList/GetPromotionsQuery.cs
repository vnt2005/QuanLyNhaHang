using MediatR;
using QuanLyNhaHang.Application.Features.Promotions.DTOs;

namespace QuanLyNhaHang.Application.Features.Promotions.Queries.GetList;

public class GetPromotionsQuery : IRequest<List<PromotionDto>>
{
    public string? DiscountType { get; set; }

    public bool? IsActive { get; set; }

    public bool? IsValidNow { get; set; }
}