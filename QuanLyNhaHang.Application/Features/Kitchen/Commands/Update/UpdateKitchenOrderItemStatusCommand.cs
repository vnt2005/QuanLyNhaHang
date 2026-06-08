using MediatR;

namespace QuanLyNhaHang.Application.Features.Kitchen.Commands.Update;

public class UpdateKitchenOrderItemStatusCommand : IRequest<bool>
{
    public Guid OrderItemId { get; set; }

    public string Status { get; set; } = string.Empty;

    public string? Note { get; set; }
}