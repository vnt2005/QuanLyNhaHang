using MediatR;
using QuanLyNhaHang.Application.Features.PromotionUsages.DTOs;

namespace QuanLyNhaHang.Application.Features.PromotionUsages.Queries.GetById;

public class GetPromotionUsageByIdQuery : IRequest<PromotionUsageDto?>
{
    public Guid Id { get; set; }
}