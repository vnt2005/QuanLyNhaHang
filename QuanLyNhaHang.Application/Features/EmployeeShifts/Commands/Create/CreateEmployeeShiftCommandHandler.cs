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

        var shiftExists = await _context.Shifts
            .AnyAsync(x => x.Id == request.ShiftId && x.IsActive, cancellationToken);

        if (!shiftExists)
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