using MediatR;
using Microsoft.EntityFrameworkCore;
using QuanLyNhaHang.Application.Common.Interfaces;
using QuanLyNhaHang.Application.Common.Models;
using QuanLyNhaHang.Application.Features.Reservations.DTOs;

namespace QuanLyNhaHang.Application.Features.Reservations.Queries.GetWithPaginatedList;

public class GetReservationsWithPaginatedListQueryHandler
    : IRequestHandler<GetReservationsWithPaginatedListQuery, PaginatedList<ReservationDto>>
{
    private readonly IApplicationDbContext _context;

    public GetReservationsWithPaginatedListQueryHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<PaginatedList<ReservationDto>> Handle(
        GetReservationsWithPaginatedListQuery request,
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

        if (!string.IsNullOrWhiteSpace(request.Keyword))
        {
            var keyword = request.Keyword.Trim();

            query = query.Where(x =>
                x.Reservation.ReservationCode.Contains(keyword) ||
                x.Reservation.CustomerName.Contains(keyword) ||
                x.Reservation.PhoneNumber.Contains(keyword) ||
                x.TableName.Contains(keyword));
        }

        if (!string.IsNullOrWhiteSpace(request.Status))
        {
            query = query.Where(x => x.Reservation.Status == request.Status);
        }

        if (request.FromDate.HasValue)
        {
            query = query.Where(x => x.Reservation.ReservationTime >= request.FromDate.Value.Date);
        }

        if (request.ToDate.HasValue)
        {
            var toDate = request.ToDate.Value.Date.AddDays(1);
            query = query.Where(x => x.Reservation.ReservationTime < toDate);
        }

        var reservationDtos = query
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
            });

        return await PaginatedList<ReservationDto>.CreateAsync(
            reservationDtos,
            request.PageNumber,
            request.PageSize);
    }
}