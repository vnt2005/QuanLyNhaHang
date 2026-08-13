using MediatR;
using Microsoft.EntityFrameworkCore;
using QuanLyNhaHang.Application.Common.Extensions;
using QuanLyNhaHang.Application.Common.Interfaces;
using QuanLyNhaHang.Application.Common.Notifications;
using QuanLyNhaHang.Application.Features.Notifications.DTOs;
using QuanLyNhaHang.Application.Features.Reservations.DTOs;
using QuanLyNhaHang.Domain.Entities;

namespace QuanLyNhaHang.Application.Features.Reservations.Commands.Create;

public class CreateReservationCommandHandler
    : IRequestHandler<CreateReservationCommand, ReservationDto>
{
    private readonly IApplicationDbContext _context;
    private readonly IAdminNotificationPublisher _notificationPublisher;

    public CreateReservationCommandHandler(
        IApplicationDbContext context,
        IAdminNotificationPublisher notificationPublisher)
    {
        _context = context;
        _notificationPublisher = notificationPublisher;
    }

    public async Task<ReservationDto> Handle(
        CreateReservationCommand request,
        CancellationToken cancellationToken)
    {
        var table = await _context.RestaurantTables
            .WhereOperational(_context)
            .FirstOrDefaultAsync(
                x => x.Id == request.RestaurantTableId,
                cancellationToken);

        if (table == null)
        {
            throw new InvalidOperationException(
                "Bàn không tồn tại hoặc đã ngừng hoạt động.");
        }

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

        var notifications = new List<Notification>();

        if (request.IsCustomerRequest)
        {
            var recipientUserIds = await _context.Users
                .AsNoTracking()
                .Where(user =>
                    user.IsActive &&
                    user.IsEmailVerified &&
                    AdminNotificationAudience.OrderAndReservationRoles
                        .Contains(user.Role))
                .Select(user => user.Id)
                .ToListAsync(cancellationToken);

            notifications = recipientUserIds
                .Select(userId => new Notification(
                    userId,
                    "Reservation.CreatedFromCustomer",
                    "Yêu cầu đặt bàn mới",
                    $"{reservation.CustomerName} vừa yêu cầu đặt " +
                    $"{table.Name} cho {reservation.NumberOfGuests} khách.",
                    "warning",
                    "Đặt bàn",
                    reservation.Id))
                .ToList();

            if (notifications.Count > 0)
            {
                await _context.Notifications.AddRangeAsync(
                    notifications,
                    cancellationToken);
            }
        }

        await _context.SaveChangesAsync(cancellationToken);

        await _notificationPublisher.PublishAsync(
            notifications.Select(NotificationDto.FromEntity).ToArray(),
            cancellationToken);

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
