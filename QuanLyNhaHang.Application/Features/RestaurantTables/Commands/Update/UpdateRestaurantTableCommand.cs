using MediatR;

namespace QuanLyNhaHang.Application.Features.RestaurantTables.Commands.Update;

public class UpdateRestaurantTableCommand : IRequest<bool>
{
    public Guid Id { get; set; }

    public Guid AreaId { get; set; }

    public string Name { get; set; } = string.Empty;

    public int Capacity { get; set; }

    public string? Note { get; set; }
}