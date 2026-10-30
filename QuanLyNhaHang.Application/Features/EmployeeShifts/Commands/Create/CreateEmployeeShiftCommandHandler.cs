using MediatR;
using Microsoft.EntityFrameworkCore;
using QuanLyNhaHang.Application.Common.Interfaces;
using QuanLyNhaHang.Domain.Entities;

namespace QuanLyNhaHang.Application.Features.EmployeeShifts.Commands.Create;

public class CreateEmployeeShiftCommandHandler
    : IRequestHandler<CreateEmployeeShiftCommand, Guid>
{
    private readonly IApplicationDbContext _context;

    public CreateEmployeeShiftCommandHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<Guid> Handle(
        CreateEmployeeShiftCommand request,
        CancellationToken cancellationToken)
    {
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

        var employeeShiftExists = await _context.EmployeeShifts
            .AnyAsync(x =>
                x.EmployeeId == request.EmployeeId &&
                x.ShiftId == request.ShiftId &&
                x.WorkDate == workDate,
                cancellationToken);

        if (employeeShiftExists)
        {
            throw new Exception("Nhân viên đã được phân công vào ca này trong ngày này.");
        }

        var targetStart = workDate + targetShift.StartTime;
        var targetEnd = targetShift.IsOvernight
            ? workDate.AddDays(1) + targetShift.EndTime
            : workDate + targetShift.EndTime;

        var existingAssignments = await _context.EmployeeShifts
            .Where(x => x.EmployeeId == request.EmployeeId &&
                        x.IsActive &&
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

        var employeeShift = new EmployeeShift(
            request.EmployeeId,
            request.ShiftId,
            workDate,
            request.Note);

        _context.EmployeeShifts.Add(employeeShift);

        await _context.SaveChangesAsync(cancellationToken);

        return employeeShift.Id;
    }
}
