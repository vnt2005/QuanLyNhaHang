using MediatR;
using QuanLyNhaHang.Application.Features.Promotions.DTOs;

namespace QuanLyNhaHang.Application.Features.Promotions.Queries.GetById;

public class GetPromotionByIdQuery : IRequest<PromotionDto?>
{
    public Guid Id { get; set; }
}