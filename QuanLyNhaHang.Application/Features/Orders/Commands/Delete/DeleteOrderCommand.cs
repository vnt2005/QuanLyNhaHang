using MediatR;

namespace QuanLyNhaHang.Application.Features.Orders.Commands.Delete;

public class DeleteOrderCommand : IRequest<bool>
{
    public Guid Id { get; set; }

    public DeleteOrderCommand(Guid id)
    {
        Id = id;
    }
}