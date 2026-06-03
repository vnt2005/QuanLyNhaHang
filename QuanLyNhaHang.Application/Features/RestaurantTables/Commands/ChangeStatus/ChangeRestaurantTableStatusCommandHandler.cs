using MediatR;
using Microsoft.EntityFrameworkCore;
using QuanLyNhaHang.Application.Common.Interfaces;

namespace QuanLyNhaHang.Application.Features.RestaurantTables.Commands.ChangeStatus;

public class ChangeRestaurantTableStatusCommandHandler
    : IRequestHandler<ChangeRestaurantTableStatusCommand, bool>
{
    private readonly IApplicationDbContext _context;

    public ChangeRestaurantTableStatusCommandHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<bool> Handle(
        ChangeRestaurantTableStatusCommand request,
        CancellationToken cancellationToken)
    {
        var table = await _context.RestaurantTables
            .FirstOrDefaultAsync(x => x.Id == request.Id, cancellationToken);

        if (table == null)
        {
            return false;
        }

        var status = request.Status.Trim();

        switch (status)
        {
            case "Available":
                table.MarkAvailable();
                break;

            case "Occupied":
                table.MarkOccupied();
                break;

            case "Reserved":
                table.MarkReserved();
                break;

            case "Cleaning":
                table.MarkCleaning();
                break;

            default:
                throw new Exception("Trạng thái bàn không hợp lệ.");
        }

        await _context.SaveChangesAsync(cancellationToken);

        return true;
    }
}