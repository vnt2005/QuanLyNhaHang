using MediatR;
using Microsoft.EntityFrameworkCore;
using QuanLyNhaHang.Application.Common.Interfaces;

namespace QuanLyNhaHang.Application.Features.Shifts.Commands.Delete;

public class DeleteShiftCommandHandler : IRequestHandler<DeleteShiftCommand, bool>
{
    private readonly IApplicationDbContext _context;

    public DeleteShiftCommandHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<bool> Handle(
        DeleteShiftCommand request,
        CancellationToken cancellationToken)
    {
        var shift = await _context.Shifts
            .FirstOrDefaultAsync(x => x.Id == request.Id, cancellationToken);

        if (shift == null)
        {
            throw new Exception("Không tìm thấy ca làm việc.");
        }

        _context.Shifts.Remove(shift);

        await _context.SaveChangesAsync(cancellationToken);

        return true;
    }
}