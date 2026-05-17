using MediatR;
using Microsoft.EntityFrameworkCore;
using QuanLyNhaHang.Application.Common.Interfaces;
using QuanLyNhaHang.Application.Common.Models;
using QuanLyNhaHang.Application.Features.EmployeeShifts.DTOs;

namespace QuanLyNhaHang.Application.Features.EmployeeShifts.Queries.GetWithPaginatedList;

public class GetEmployeeShiftsWithPaginatedListQueryHandler
    : IRequestHandler<GetEmployeeShiftsWithPaginatedListQuery, PaginatedList<EmployeeShiftDto>>
{
    private readonly IApplicationDbContext _context;

    public GetEmployeeShiftsWithPaginatedListQueryHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<PaginatedList<EmployeeShiftDto>> Handle(
        GetEmployeeShiftsWithPaginatedListQuery request,
        CancellationToken cancellationToken)
    {
        var query =
            from employeeShift in _context.EmployeeShifts.AsNoTracking()
            join employee in _context.Employees.AsNoTracking()
                on employeeShift.EmployeeId equals employee.Id
            join shift in _context.Shifts.AsNoTracking()
                on employeeShift.ShiftId equals shift.Id
            select new
            {
                EmployeeShift = employeeShift,
                Employee = employee,
                Shift = shift
            };

        if (!string.IsNullOrWhiteSpace(request.Keyword))
        {
            var keyword = request.Keyword.Trim();

            query = query.Where(x =>
                x.Employee.EmployeeCode.Contains(keyword) ||
                (x.Employee.Ho != null && x.Employee.Ho.Contains(keyword)) ||
                x.Employee.Ten.Contains(keyword) ||
                ((x.Employee.Ho ?? "") + " " + x.Employee.Ten).Contains(keyword) ||
                x.Shift.ShiftCode.Contains(keyword) ||
                x.Shift.ShiftName.Contains(keyword) ||
                (x.EmployeeShift.Note != null && x.EmployeeShift.Note.Contains(keyword)));
        }

        if (request.WorkDate.HasValue)
        {
            var workDate = request.WorkDate.Value.Date;

            query = query.Where(x => x.EmployeeShift.WorkDate == workDate);
        }

        if (request.EmployeeId.HasValue)
        {
            query = query.Where(x => x.EmployeeShift.EmployeeId == request.EmployeeId.Value);
        }

        if (request.ShiftId.HasValue)
        {
            query = query.Where(x => x.EmployeeShift.ShiftId == request.ShiftId.Value);
        }

        var result = query
            .OrderByDescending(x => x.EmployeeShift.WorkDate)
            .ThenBy(x => x.Shift.StartTime)
            .Select(x => new EmployeeShiftDto
            {
                Id = x.EmployeeShift.Id,

                EmployeeId = x.Employee.Id,
                EmployeeCode = x.Employee.EmployeeCode,
                EmployeeHo = x.Employee.Ho,
                EmployeeTen = x.Employee.Ten,

                ShiftId = x.Shift.Id,
                ShiftCode = x.Shift.ShiftCode,
                ShiftName = x.Shift.ShiftName,
                StartTime = x.Shift.StartTime,
                EndTime = x.Shift.EndTime,

                WorkDate = x.EmployeeShift.WorkDate,
                Note = x.EmployeeShift.Note,
                IsActive = x.EmployeeShift.IsActive,
                CreatedAt = x.EmployeeShift.CreatedAt,
                UpdatedAt = x.EmployeeShift.UpdatedAt
            });

        return await PaginatedList<EmployeeShiftDto>.CreateAsync(
            result,
            request.PageNumber,
            request.PageSize,
            cancellationToken);
    }
}