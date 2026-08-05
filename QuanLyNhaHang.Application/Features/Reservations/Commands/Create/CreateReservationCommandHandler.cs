using MediatR;
using Microsoft.EntityFrameworkCore;
using QuanLyNhaHang.Application.Common.Interfaces;
using QuanLyNhaHang.Application.Features.Reservations.DTOs;
using QuanLyNhaHang.Domain.Entities;

namespace QuanLyNhaHang.Application.Features.Reservations.Commands.Create;

public class CreateReservationCommandHandler
    : IRequestHandler<CreateReservationCommand, ReservationDto>
{
    private readonly IApplicationDbContext _context;

    public CreateReservationCommandHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<ReservationDto> Handle(
        CreateReservationCommand request,
        CancellationToken cancellationToken)
    {
        var table = await _context.RestaurantTables
            .FirstOrDefaultAsync(x => x.Id == request.RestaurantTableId, cancellationToken);

        if (table == null)
            throw new KeyNotFoundException("Không tìm thấy bàn.");

        if (!table.IsActive)
            throw new InvalidOperationException("Bàn này đã bị vô hiệu hóa.");

        if (request.NumberOfGuests > table.Capacity)
            throw new ArgumentException("Số lượng khách vượt quá sức chứa của bàn.");

        if (request.ReservationTime <= DateTime.UtcNow)
            throw new ArgumentException(
                "Thời gian đặt bàn phải lớn hơn thời gian hiện tại.");

        var fromTime = request.ReservationTime.AddHours(-2);
        var toTime = request.ReservationTime.AddHours(2);

        var existedReservation = await _context.Reservations
            .AnyAsync(x =>
                x.RestaurantTableId == request.RestaurantTableId &&
                x.ReservationTime >= fromTime &&
                x.ReservationTime <= toTime &&
                x.Status != "Cancelled" &&
                x.Status != "Completed" &&
                x.Status != "NoShow",
                cancellationToken);

        if (existedReservation)
            throw new InvalidOperationException(
                "Bàn này đã có lịch đặt trong khoảng thời gian gần đó.");

        var reservation = new Reservation(
            request.RestaurantTableId,
            request.CustomerName,
            request.PhoneNumber,
            request.Email,
            request.NumberOfGuests,
            request.ReservationTime,
            request.DepositAmount,
            request.Note);

        await _context.Reservations.AddAsync(reservation, cancellationToken);

        await _context.SaveChangesAsync(cancellationToken);

        return new ReservationDto
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
        };
    }
}
