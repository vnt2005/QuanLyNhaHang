using MediatR;

namespace QuanLyNhaHang.Application.Features.Promotions.Commands.Delete;

public class DeletePromotionCommand : IRequest<bool>
{
    public Guid Id { get; set; }
}