using MediatR;

namespace QuanLyNhaHang.Application.Features.RestaurantTables.Commands.Create;

public class CreateRestaurantTableCommand : IRequest<Guid>
{
    public Guid AreaId { get; set; }

    public string Name { get; set; } = string.Empty;

    public int Capacity { get; set; }

    public string? Note { get; set; }
}