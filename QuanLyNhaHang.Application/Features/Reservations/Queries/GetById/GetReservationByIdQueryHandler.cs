using MediatR;
using Microsoft.EntityFrameworkCore;
using QuanLyNhaHang.Application.Common.Interfaces;
using QuanLyNhaHang.Application.Features.Reservations.DTOs;

namespace QuanLyNhaHang.Application.Features.Reservations.Queries.GetById;

public class GetReservationByIdQueryHandler
    : IRequestHandler<GetReservationByIdQuery, ReservationDto?>
{
    private readonly IApplicationDbContext _context;

    public GetReservationByIdQueryHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<ReservationDto?> Handle(
        GetReservationByIdQuery request,
        CancellationToken cancellationToken)
    {
        return await (
            from reservation in _context.Reservations.AsNoTracking()
            join table in _context.RestaurantTables.AsNoTracking()
                on reservation.RestaurantTableId equals table.Id
            where reservation.Id == request.Id
            select new ReservationDto
            {
                Id = reservation.Id,
                ReservationCode = reservation.ReservationCode,
                RestaurantTableId = reservation.RestaurantTableId,
                RestaurantTableName = table.Name,
                CustomerName = reservation.CustomerName,
                PhoneNumber = reservation.PhoneNumber,
                Email = reservation.Email,
                NumberOfGuests = reservation.NumberOfGuests,
                ReservationTime = reservation.ReservationTime,
                DepositAmount = reservation.DepositAmount,
                Status = reservation.Status,
                Note = reservation.Note,
                CreatedAt = reservation.CreatedAt,
                ConfirmedAt = reservation.ConfirmedAt,
                CheckedInAt = reservation.CheckedInAt,
                CompletedAt = reservation.CompletedAt,
                CancelledAt = reservation.CancelledAt,
                UpdatedAt = reservation.UpdatedAt
            }
        ).FirstOrDefaultAsync(cancellationToken);
    }
}