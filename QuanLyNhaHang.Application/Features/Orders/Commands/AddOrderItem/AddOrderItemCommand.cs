using MediatR;

namespace QuanLyNhaHang.Application.Features.Orders.Commands.AddOrderItem;

public class AddOrderItemCommand : IRequest<bool>
{
    public Guid OrderId { get; set; }

    public Guid MenuItemId { get; set; }

    public int Quantity { get; set; }

    public string? Note { get; set; }
}