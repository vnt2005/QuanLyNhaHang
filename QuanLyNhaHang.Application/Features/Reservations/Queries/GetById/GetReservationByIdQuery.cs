using MediatR;
using QuanLyNhaHang.Application.Features.Reservations.DTOs;

namespace QuanLyNhaHang.Application.Features.Reservations.Queries.GetById;

public class GetReservationByIdQuery : IRequest<ReservationDto?>
{
    public Guid Id { get; set; }
}