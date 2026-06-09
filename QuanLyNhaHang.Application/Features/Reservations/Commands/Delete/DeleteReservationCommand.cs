using MediatR;

namespace QuanLyNhaHang.Application.Features.Reservations.Commands.Delete;

public class DeleteReservationCommand : IRequest<bool>
{
    public Guid Id { get; set; }
}