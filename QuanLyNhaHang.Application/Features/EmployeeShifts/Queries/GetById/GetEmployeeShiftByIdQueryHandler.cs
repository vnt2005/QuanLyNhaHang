using MediatR;
using Microsoft.EntityFrameworkCore;
using QuanLyNhaHang.Application.Common.Interfaces;
using QuanLyNhaHang.Application.Features.EmployeeShifts.DTOs;

namespace QuanLyNhaHang.Application.Features.EmployeeShifts.Queries.GetById;

public class GetEmployeeShiftByIdQueryHandler
    : IRequestHandler<GetEmployeeShiftByIdQuery, EmployeeShiftDto?>
{
    private readonly IApplicationDbContext _context;

    public GetEmployeeShiftByIdQueryHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<EmployeeShiftDto?> Handle(
        GetEmployeeShiftByIdQuery request,
        CancellationToken cancellationToken)
    {
        return await (
            from employeeShift in _context.EmployeeShifts.AsNoTracking()
            join employee in _context.Employees.AsNoTracking()
                on employeeShift.EmployeeId equals employee.Id
            join shift in _context.Shifts.AsNoTracking()
                on employeeShift.ShiftId equals shift.Id
            where employeeShift.Id == request.Id
            select new EmployeeShiftDto
            {
                Id = employeeShift.Id,

                EmployeeId = employee.Id,
                EmployeeCode = employee.EmployeeCode,
                EmployeeHo = employee.Ho,
                EmployeeTen = employee.Ten,

                ShiftId = shift.Id,
                ShiftCode = shift.ShiftCode,
                ShiftName = shift.ShiftName,
                StartTime = shift.StartTime,
                EndTime = shift.EndTime,

                WorkDate = employeeShift.WorkDate,
                Note = employeeShift.Note,
                IsActive = employeeShift.IsActive,
                CreatedAt = employeeShift.CreatedAt,
                UpdatedAt = employeeShift.UpdatedAt
            })
            .FirstOrDefaultAsync(cancellationToken);
    }
}