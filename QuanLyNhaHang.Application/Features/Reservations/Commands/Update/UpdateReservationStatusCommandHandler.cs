using MediatR;
using Microsoft.EntityFrameworkCore;
using QuanLyNhaHang.Application.Common.Interfaces;
using QuanLyNhaHang.Application.Features.Reservations.DTOs;

namespace QuanLyNhaHang.Application.Features.Reservations.Commands.Update;

public class UpdateReservationStatusCommandHandler
    : IRequestHandler<UpdateReservationStatusCommand, ReservationDto>
{
    private readonly IApplicationDbContext _context;

    public UpdateReservationStatusCommandHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<ReservationDto> Handle(
        UpdateReservationStatusCommand request,
        CancellationToken cancellationToken)
    {
        var reservation = await _context.Reservations
            .FirstOrDefaultAsync(x => x.Id == request.Id, cancellationToken);

        if (reservation == null)
        {
            throw new KeyNotFoundException(
                "Không tìm thấy đặt bàn.");
        }

        var table = await _context.RestaurantTables
            .FirstOrDefaultAsync(
                x => x.Id == reservation.RestaurantTableId,
                cancellationToken);

        if (table == null)
        {
            throw new KeyNotFoundException(
                "Không tìm thấy bàn.");
        }

        if (string.IsNullOrWhiteSpace(request.Status))
        {
            throw new ArgumentException(
                "Trạng thái đặt bàn không được để trống.");
        }

        var status = request.Status.Trim();

        switch (status)
        {
            case "Confirmed":
                EnsureTableIsActive(table.IsActive);
                reservation.Confirm();

                if (!await HasActiveOrderAsync(
                        table.Id,
                        cancellationToken))
                {
                    table.MarkReserved();
                }

                break;

            case "CheckedIn":
                EnsureTableIsActive(table.IsActive);

                if (await HasActiveOrderAsync(
                        table.Id,
                        cancellationToken))
                {
                    throw new InvalidOperationException(
                        "Bàn đang có order hoạt động, chưa thể nhận bàn.");
                }

                reservation.CheckIn();
                table.MarkOccupied();
                break;

            case "Completed":
                reservation.Complete();

                if (!await HasActiveOrderAsync(
                        table.Id,
                        cancellationToken))
                {
                    table.MarkAvailable();
                }

                break;

            case "Cancelled":
                reservation.Cancel();

                if (!await HasActiveOrderAsync(
                        table.Id,
                        cancellationToken) &&
                    !await HasOtherActiveReservationAsync(
                        reservation.Id,
                        table.Id,
                        cancellationToken))
                {
                    table.MarkAvailable();
                }

                break;

            case "NoShow":
                reservation.MarkNoShow();

                if (!await HasActiveOrderAsync(
                        table.Id,
                        cancellationToken) &&
                    !await HasOtherActiveReservationAsync(
                        reservation.Id,
                        table.Id,
                        cancellationToken))
                {
                    table.MarkAvailable();
                }

                break;

            default:
                throw new ArgumentException(
                    "Trạng thái đặt bàn không hợp lệ.");
        }

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

    private static void EnsureTableIsActive(bool isActive)
    {
        if (!isActive)
        {
            throw new InvalidOperationException(
                "Bàn này đã bị vô hiệu hóa.");
        }
    }

    private async Task<bool> HasActiveOrderAsync(
        Guid restaurantTableId,
        CancellationToken cancellationToken)
    {
        return await _context.Orders.AnyAsync(x =>
            x.RestaurantTableId == restaurantTableId &&
            x.IsActive &&
            x.Status != "Completed" &&
            x.Status != "Cancelled",
            cancellationToken);
    }

    private async Task<bool> HasOtherActiveReservationAsync(
        Guid reservationId,
        Guid restaurantTableId,
        CancellationToken cancellationToken)
    {
        return await _context.Reservations.AnyAsync(x =>
            x.Id != reservationId &&
            x.RestaurantTableId == restaurantTableId &&
            x.Status != "Cancelled" &&
            x.Status != "Completed" &&
            x.Status != "NoShow",
            cancellationToken);
    }
}
