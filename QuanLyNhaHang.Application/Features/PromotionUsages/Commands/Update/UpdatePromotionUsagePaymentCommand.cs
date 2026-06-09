using MediatR;
using QuanLyNhaHang.Application.Features.PromotionUsages.DTOs;

namespace QuanLyNhaHang.Application.Features.PromotionUsages.Commands.Update;

public class UpdatePromotionUsagePaymentCommand : IRequest<PromotionUsageDto>
{
    public Guid Id { get; set; }

    public Guid PaymentId { get; set; }
}