using MediatR;
using Microsoft.EntityFrameworkCore;
using QuanLyNhaHang.Application.Common.Interfaces;
using QuanLyNhaHang.Domain.Entities;

namespace QuanLyNhaHang.Application.Features.Shifts.Commands.Create;

public class CreateShiftCommandHandler : IRequestHandler<CreateShiftCommand, Guid>
{
    private readonly IApplicationDbContext _context;

    public CreateShiftCommandHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<Guid> Handle(
        CreateShiftCommand request,
        CancellationToken cancellationToken)
    {
        var shiftCode = request.ShiftCode.Trim().ToUpper();

        var shiftCodeExists = await _context.Shifts
            .AnyAsync(x => x.ShiftCode == shiftCode, cancellationToken);

        if (shiftCodeExists)
        {
            throw new Exception("Mã ca làm việc đã tồn tại.");
        }

        var shiftNameExists = await _context.Shifts
            .AnyAsync(x => x.ShiftName == request.ShiftName.Trim(), cancellationToken);

        if (shiftNameExists)
        {
            throw new Exception("Tên ca làm việc đã tồn tại.");
        }

        var shift = new Shift(
            request.ShiftCode,
            request.ShiftName,
            request.StartTime,
            request.EndTime,
            request.Description);

        _context.Shifts.Add(shift);

        await _context.SaveChangesAsync(cancellationToken);

        return shift.Id;
    }
}