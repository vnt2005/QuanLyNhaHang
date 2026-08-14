using MediatR;
using Microsoft.EntityFrameworkCore;
using QuanLyNhaHang.Application.Common.Constants;
using QuanLyNhaHang.Application.Common.Extensions;
using QuanLyNhaHang.Application.Common.Interfaces;
using QuanLyNhaHang.Application.Common.Notifications;
using QuanLyNhaHang.Application.Features.Notifications.DTOs;
using QuanLyNhaHang.Application.Features.Reservations.DTOs;
using QuanLyNhaHang.Domain.Entities;

namespace QuanLyNhaHang.Application.Features.Reservations.Commands.Update;

public class UpdateReservationStatusCommandHandler
    : IRequestHandler<UpdateReservationStatusCommand, ReservationDto>
{
    private readonly IApplicationDbContext _context;
    private readonly IAdminNotificationPublisher _notificationPublisher;

    public UpdateReservationStatusCommandHandler(
        IApplicationDbContext context,
        IAdminNotificationPublisher notificationPublisher)
    {
        _context = context;
        _notificationPublisher = notificationPublisher;
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

        var tableIsAvailable = await _context.RestaurantTables
            .AsNoTracking()
            .WhereOperational(_context)
            .AnyAsync(x => x.Id == table.Id, cancellationToken);

        if (string.IsNullOrWhiteSpace(request.Status))
        {
            throw new ArgumentException(
                "Trạng thái đặt bàn không được để trống.");
        }

        var status = request.Status.Trim();

        switch (status)
        {
            case "Confirmed":
                EnsureTableIsActive(tableIsAvailable);
                reservation.Confirm();

                if (!await HasActiveOrderAsync(
                        table.Id,
                        cancellationToken))
                {
                    table.MarkReserved();
                }

                break;

            case "CheckedIn":
                EnsureTableIsActive(tableIsAvailable);

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

        var customerNotification = await CreateCustomerNotificationAsync(
            reservation,
            table.Name,
            cancellationToken);

        if (customerNotification != null)
        {
            await _context.Notifications.AddAsync(
                customerNotification,
                cancellationToken);
        }

        await _context.SaveChangesAsync(cancellationToken);

        if (customerNotification != null)
        {
            await _notificationPublisher.PublishAsync(
                new[] { NotificationDto.FromEntity(customerNotification) },
                cancellationToken);
        }

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

    private async Task<Notification?> CreateCustomerNotificationAsync(
        Reservation reservation,
        string tableName,
        CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(reservation.Email))
        {
            return null;
        }

        var normalizedEmail = reservation.Email.Trim().ToLowerInvariant();
        var customerUserId = await _context.Users
            .AsNoTracking()
            .Where(user =>
                user.IsActive &&
                user.Role == SystemRoles.Customer &&
                user.Email == normalizedEmail)
            .Select(user => (Guid?)user.Id)
            .FirstOrDefaultAsync(cancellationToken);

        if (!customerUserId.HasValue)
        {
            return null;
        }

        var (title, message, severity) = reservation.Status switch
        {
            "Confirmed" => (
                "Đặt bàn đã được xác nhận",
                $"Yêu cầu {reservation.ReservationCode} tại {tableName} đã được nhà hàng xác nhận.",
                "success"),
            "CheckedIn" => (
                "Đã nhận bàn",
                $"Đặt bàn {reservation.ReservationCode} tại {tableName} đã được ghi nhận nhận bàn.",
                "info"),
            "Completed" => (
                "Đặt bàn đã hoàn tất",
                $"Đặt bàn {reservation.ReservationCode} tại {tableName} đã hoàn tất.",
                "success"),
            "Cancelled" => (
                "Đặt bàn đã bị hủy",
                $"Đặt bàn {reservation.ReservationCode} tại {tableName} đã bị hủy.",
                "warning"),
            "NoShow" => (
                "Đặt bàn được ghi nhận vắng mặt",
                $"Đặt bàn {reservation.ReservationCode} tại {tableName} được ghi nhận là không đến.",
                "warning"),
            _ => (string.Empty, string.Empty, string.Empty)
        };

        if (string.IsNullOrEmpty(title))
        {
            return null;
        }

        return new Notification(
            customerUserId.Value,
            $"Reservation.{reservation.Status}",
            title,
            message,
            severity,
            "Đặt bàn",
            reservation.Id);
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
