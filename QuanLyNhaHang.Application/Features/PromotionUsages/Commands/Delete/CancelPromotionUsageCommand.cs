using MediatR;

namespace QuanLyNhaHang.Application.Features.PromotionUsages.Commands.Delete;

public class CancelPromotionUsageCommand : IRequest<bool>
{
    public Guid Id { get; set; }
}