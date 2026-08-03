using MediatR;
using Microsoft.EntityFrameworkCore;
using QuanLyNhaHang.Application.Common.Interfaces;
using QuanLyNhaHang.Application.Common.Time;
using QuanLyNhaHang.Application.Features.Reservations.DTOs;

namespace QuanLyNhaHang.Application.Features.Reservations.Queries.GetList;

public class GetReservationsQueryHandler
    : IRequestHandler<GetReservationsQuery, List<ReservationDto>>
{
    private readonly IApplicationDbContext _context;

    public GetReservationsQueryHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<List<ReservationDto>> Handle(
        GetReservationsQuery request,
        CancellationToken cancellationToken)
    {
        var query =
            from reservation in _context.Reservations.AsNoTracking()
            join table in _context.RestaurantTables.AsNoTracking()
                on reservation.RestaurantTableId equals table.Id
            select new
            {
                Reservation = reservation,
                TableName = table.Name
            };

        if (!string.IsNullOrWhiteSpace(request.Status))
            query = query.Where(x => x.Reservation.Status == request.Status);

        if (request.FromDate.HasValue)
        {
            var fromUtc = RestaurantTime.GetUtcStart(request.FromDate.Value);
            query = query.Where(x => x.Reservation.ReservationTime >= fromUtc);
        }

        if (request.ToDate.HasValue)
        {
            var toUtcExclusive = RestaurantTime.GetUtcEndExclusive(request.ToDate.Value);
            query = query.Where(x => x.Reservation.ReservationTime < toUtcExclusive);
        }

        return await query
            .OrderByDescending(x => x.Reservation.ReservationTime)
            .Select(x => new ReservationDto
            {
                Id = x.Reservation.Id,
                ReservationCode = x.Reservation.ReservationCode,
                RestaurantTableId = x.Reservation.RestaurantTableId,
                RestaurantTableName = x.TableName,
                CustomerName = x.Reservation.CustomerName,
                PhoneNumber = x.Reservation.PhoneNumber,
                Email = x.Reservation.Email,
                NumberOfGuests = x.Reservation.NumberOfGuests,
                ReservationTime = x.Reservation.ReservationTime,
                DepositAmount = x.Reservation.DepositAmount,
                Status = x.Reservation.Status,
                Note = x.Reservation.Note,
                CreatedAt = x.Reservation.CreatedAt,
                ConfirmedAt = x.Reservation.ConfirmedAt,
                CheckedInAt = x.Reservation.CheckedInAt,
                CompletedAt = x.Reservation.CompletedAt,
                CancelledAt = x.Reservation.CancelledAt,
                UpdatedAt = x.Reservation.UpdatedAt
            })
            .ToListAsync(cancellationToken);
    }
}
