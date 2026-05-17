using MediatR;
using Microsoft.EntityFrameworkCore;
using QuanLyNhaHang.Application.Common.Interfaces;

namespace QuanLyNhaHang.Application.Features.Shifts.Commands.Update;

public class UpdateShiftCommandHandler : IRequestHandler<UpdateShiftCommand, bool>
{
    private readonly IApplicationDbContext _context;

    public UpdateShiftCommandHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<bool> Handle(
        UpdateShiftCommand request,
        CancellationToken cancellationToken)
    {
        var shift = await _context.Shifts
            .FirstOrDefaultAsync(x => x.Id == request.Id, cancellationToken);

        if (shift == null)
        {
            throw new Exception("Không tìm thấy ca làm việc.");
        }

        var shiftCode = request.ShiftCode.Trim().ToUpper();
        var shiftName = request.ShiftName.Trim();

        var shiftCodeExists = await _context.Shifts
            .AnyAsync(x =>
                x.ShiftCode == shiftCode &&
                x.Id != request.Id,
                cancellationToken);

        if (shiftCodeExists)
        {
            throw new Exception("Mã ca làm việc đã tồn tại.");
        }

        var shiftNameExists = await _context.Shifts
            .AnyAsync(x =>
                x.ShiftName == shiftName &&
                x.Id != request.Id,
                cancellationToken);

        if (shiftNameExists)
        {
            throw new Exception("Tên ca làm việc đã tồn tại.");
        }

        shift.UpdateInfo(
            request.ShiftCode,
            request.ShiftName,
            request.StartTime,
            request.EndTime,
            request.Description);

        if (request.IsActive)
        {
            shift.Activate();
        }
        else
        {
            shift.Deactivate();
        }

        await _context.SaveChangesAsync(cancellationToken);

        return true;
    }
}