using MediatR;
using QuanLyNhaHang.Application.Features.Reservations.DTOs;

namespace QuanLyNhaHang.Application.Features.Reservations.Commands.Update;

public class UpdateReservationStatusCommand : IRequest<ReservationDto>
{
    public Guid Id { get; set; }

    public string Status { get; set; } = string.Empty;
}