using MediatR;
using Microsoft.EntityFrameworkCore;
using QuanLyNhaHang.Application.Common.Interfaces;

namespace QuanLyNhaHang.Application.Features.Employees.Commands.Update;

public class UpdateEmployeeCommandHandler : IRequestHandler<UpdateEmployeeCommand, bool>
{
    private readonly IApplicationDbContext _context;

    public UpdateEmployeeCommandHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<bool> Handle(
        UpdateEmployeeCommand request,
        CancellationToken cancellationToken)
    {
        var employee = await _context.Employees
            .FirstOrDefaultAsync(x => x.Id == request.Id, cancellationToken);

        if (employee == null)
        {
            throw new Exception("Không tìm thấy nhân viên.");
        }

        var employeeCode = request.EmployeeCode.Trim().ToUpper();
        var phoneNumber = request.PhoneNumber.Trim();
        var email = string.IsNullOrWhiteSpace(request.Email)
            ? null
            : request.Email.Trim().ToLower();

        var employeeCodeExists = await _context.Employees
            .AnyAsync(x =>
                x.EmployeeCode == employeeCode &&
                x.Id != request.Id,
                cancellationToken);

        if (employeeCodeExists)
        {
            throw new Exception("Mã nhân viên đã tồn tại.");
        }

        var phoneExists = await _context.Employees
            .AnyAsync(x =>
                x.PhoneNumber == phoneNumber &&
                x.Id != request.Id,
                cancellationToken);

        if (phoneExists)
        {
            throw new Exception("Số điện thoại đã tồn tại.");
        }

        if (email != null)
        {
            var emailExists = await _context.Employees
                .AnyAsync(x =>
                    x.Email == email &&
                    x.Id != request.Id,
                    cancellationToken);

            if (emailExists)
            {
                throw new Exception("Email đã tồn tại.");
            }
        }

        employee.UpdateInfo(
            request.EmployeeCode,
            request.Ho,
            request.Ten,
            request.Email,
            request.PhoneNumber,
            request.DateOfBirth,
            request.Address,
            request.Position,
            request.BaseSalary,
            request.HireDate);

        if (request.IsActive)
        {
            employee.Activate();
        }
        else
        {
            employee.Deactivate();
        }

        await _context.SaveChangesAsync(cancellationToken);

        return true;
    }
}