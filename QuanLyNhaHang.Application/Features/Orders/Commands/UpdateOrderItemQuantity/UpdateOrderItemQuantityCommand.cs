using MediatR;

namespace QuanLyNhaHang.Application.Features.Orders.Commands.UpdateOrderItemQuantity;

public class UpdateOrderItemQuantityCommand : IRequest<bool>
{
    public Guid OrderId { get; set; }

    public Guid OrderItemId { get; set; }

    public int Quantity { get; set; }
}