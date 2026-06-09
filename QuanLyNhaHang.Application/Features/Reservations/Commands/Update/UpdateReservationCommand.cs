using MediatR;
using QuanLyNhaHang.Application.Features.Reservations.DTOs;

namespace QuanLyNhaHang.Application.Features.Reservations.Commands.Update;

public class UpdateReservationCommand : IRequest<ReservationDto>
{
    public Guid Id { get; set; }

    public Guid RestaurantTableId { get; set; }

    public string CustomerName { get; set; } = string.Empty;

    public string PhoneNumber { get; set; } = string.Empty;

    public string? Email { get; set; }

    public int NumberOfGuests { get; set; }

    public DateTime ReservationTime { get; set; }

    public decimal DepositAmount { get; set; }

    public string? Note { get; set; }
}