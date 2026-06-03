using MediatR;

namespace QuanLyNhaHang.Application.Features.Orders.Commands.Update;

public class UpdateOrderCommand : IRequest<bool>
{
    public Guid Id { get; set; }

    public string? Note { get; set; }
}