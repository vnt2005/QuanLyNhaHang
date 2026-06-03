using MediatR;

namespace QuanLyNhaHang.Application.Features.Orders.Commands.CancelOrderItem;

public class CancelOrderItemCommand : IRequest<bool>
{
    public Guid OrderId { get; set; }

    public Guid OrderItemId { get; set; }
}