using MediatR;
using Microsoft.EntityFrameworkCore;
using QuanLyNhaHang.Application.Common.Interfaces;

namespace QuanLyNhaHang.Application.Features.Reservations.Commands.Delete;

public class DeleteReservationCommandHandler
    : IRequestHandler<DeleteReservationCommand, bool>
{
    private readonly IApplicationDbContext _context;

    public DeleteReservationCommandHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<bool> Handle(
        DeleteReservationCommand request,
        CancellationToken cancellationToken)
    {
        var reservation = await _context.Reservations
            .FirstOrDefaultAsync(x => x.Id == request.Id, cancellationToken);

        if (reservation == null)
            throw new Exception("Không tìm thấy đặt bàn.");

        reservation.Cancel();

        var table = await _context.RestaurantTables
            .FirstOrDefaultAsync(x => x.Id == reservation.RestaurantTableId, cancellationToken);

        if (table != null)
        {
            var hasActiveOrder = await _context.Orders.AnyAsync(x =>
                x.RestaurantTableId == table.Id &&
                x.Status != "Completed" &&
                x.Status != "Cancelled",
                cancellationToken);

            var hasOtherActiveReservation = await _context.Reservations.AnyAsync(x =>
                x.Id != reservation.Id &&
                x.RestaurantTableId == table.Id &&
                x.Status != "Cancelled" &&
                x.Status != "Completed" &&
                x.Status != "NoShow",
                cancellationToken);

            if (!hasActiveOrder && !hasOtherActiveReservation)
            {
                table.MarkAvailable();
            }
        }

        await _context.SaveChangesAsync(cancellationToken);

        return true;
    }
}