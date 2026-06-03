using MediatR;

namespace QuanLyNhaHang.Application.Features.Orders.Commands.Create;

public class CreateOrderCommand : IRequest<Guid>
{
    public Guid RestaurantTableId { get; set; }

    public string? Note { get; set; }

    public List<CreateOrderItemRequest> Items { get; set; } = new();
}