using MediatR;
using Microsoft.EntityFrameworkCore;
using QuanLyNhaHang.Application.Common.Interfaces;

namespace QuanLyNhaHang.Application.Features.RestaurantTables.Commands.Delete;

public class DeleteRestaurantTableCommandHandler
    : IRequestHandler<DeleteRestaurantTableCommand, bool>
{
    private readonly IApplicationDbContext _context;

    public DeleteRestaurantTableCommandHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<bool> Handle(
        DeleteRestaurantTableCommand request,
        CancellationToken cancellationToken)
    {
        var table = await _context.RestaurantTables
            .FirstOrDefaultAsync(x => x.Id == request.Id, cancellationToken);

        if (table == null)
        {
            return false;
        }

        table.Deactivate();

        await _context.SaveChangesAsync(cancellationToken);

        return true;
    }
}