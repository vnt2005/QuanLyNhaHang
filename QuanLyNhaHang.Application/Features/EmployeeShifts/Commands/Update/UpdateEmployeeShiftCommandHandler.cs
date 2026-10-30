using MediatR;
using Microsoft.EntityFrameworkCore;
using QuanLyNhaHang.Application.Common.Interfaces;

namespace QuanLyNhaHang.Application.Features.EmployeeShifts.Commands.Update;

public class UpdateEmployeeShiftCommandHandler : IRequestHandler<UpdateEmployeeShiftCommand, bool>
{
    private readonly IApplicationDbContext _context;

    public UpdateEmployeeShiftCommandHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<bool> Handle(
        UpdateEmployeeShiftCommand request,
        CancellationToken cancellationToken)
    {
        var employeeShift = await _context.EmployeeShifts
            .FirstOrDefaultAsync(x => x.Id == request.Id, cancellationToken);

        if (employeeShift == null)
        {
            throw new Exception("Không tìm thấy phân công ca.");
        }

        var employeeExists = await _context.Employees
            .AnyAsync(x => x.Id == request.EmployeeId && x.IsActive, cancellationToken);

        if (!employeeExists)
        {
            throw new Exception("Nhân viên không tồn tại hoặc đã ngưng hoạt động.");
        }

        var targetShift = await _context.Shifts
            .FirstOrDefaultAsync(x => x.Id == request.ShiftId && x.IsActive, cancellationToken);

        if (targetShift == null)
        {
            throw new Exception("Ca làm việc không tồn tại hoặc đã ngưng hoạt động.");
        }

        var workDate = request.WorkDate.Date;

        var duplicateExists = await _context.EmployeeShifts
            .AnyAsync(x =>
                x.EmployeeId == request.EmployeeId &&
                x.ShiftId == request.ShiftId &&
                x.WorkDate == workDate &&
                x.Id != request.Id,
                cancellationToken);

        if (duplicateExists)
        {
            throw new Exception("Nhân viên đã được phân công vào ca này trong ngày này.");
        }

        if (request.IsActive)
        {
            var targetStart = workDate + targetShift.StartTime;
            var targetEnd = targetShift.IsOvernight
                ? workDate.AddDays(1) + targetShift.EndTime
                : workDate + targetShift.EndTime;

            var existingAssignments = await _context.EmployeeShifts
                .Where(x => x.EmployeeId == request.EmployeeId &&
                            x.IsActive &&
                            x.Id != request.Id &&
                            x.WorkDate >= workDate.AddDays(-1) &&
                            x.WorkDate <= workDate.AddDays(1))
                .Join(_context.Shifts,
                    es => es.ShiftId,
                    s => s.Id,
                    (es, s) => new { es.WorkDate, s.StartTime, s.EndTime, s.IsOvernight, s.ShiftName })
                .ToListAsync(cancellationToken);

            foreach (var existing in existingAssignments)
            {
                var exStart = existing.WorkDate + existing.StartTime;
                var exEnd = existing.IsOvernight
                    ? existing.WorkDate.AddDays(1) + existing.EndTime
                    : existing.WorkDate + existing.EndTime;

                if (targetStart < exEnd && targetEnd > exStart)
                {
                    throw new Exception($"Trùng giờ làm việc với ca '{existing.ShiftName}' ({existing.StartTime:hh\\:mm} - {existing.EndTime:hh\\:mm}).");
                }
            }
        }

        employeeShift.UpdateInfo(
            request.EmployeeId,
            request.ShiftId,
            workDate,
            request.Note);

        if (request.IsActive)
        {
            employeeShift.Activate();
        }
        else
        {
            employeeShift.Deactivate();
        }

        await _context.SaveChangesAsync(cancellationToken);

        return true;
    }
}
