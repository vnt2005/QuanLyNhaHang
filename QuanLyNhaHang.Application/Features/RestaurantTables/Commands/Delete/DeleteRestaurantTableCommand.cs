using MediatR;

namespace QuanLyNhaHang.Application.Features.RestaurantTables.Commands.Delete;

public class DeleteRestaurantTableCommand : IRequest<bool>
{
    public Guid Id { get; set; }

    public DeleteRestaurantTableCommand(Guid id)
    {
        Id = id;
    }
}