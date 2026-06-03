using MediatR;

namespace QuanLyNhaHang.Application.Features.MenuItems.Commands.ChangeAvailability;

public class ChangeMenuItemAvailabilityCommand : IRequest<bool>
{
    public Guid Id { get; set; }

    public bool IsAvailable { get; set; }
}