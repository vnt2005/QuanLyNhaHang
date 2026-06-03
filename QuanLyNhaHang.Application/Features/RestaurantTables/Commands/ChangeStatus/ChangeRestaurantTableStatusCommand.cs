using MediatR;

namespace QuanLyNhaHang.Application.Features.RestaurantTables.Commands.ChangeStatus;

public class ChangeRestaurantTableStatusCommand : IRequest<bool>
{
    public Guid Id { get; set; }

    public string Status { get; set; } = string.Empty;
}