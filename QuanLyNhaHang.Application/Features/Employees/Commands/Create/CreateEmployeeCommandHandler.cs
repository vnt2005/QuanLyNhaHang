using MediatR;
using Microsoft.EntityFrameworkCore;
using QuanLyNhaHang.Application.Common.Interfaces;
using QuanLyNhaHang.Domain.Entities;

namespace QuanLyNhaHang.Application.Features.Employees.Commands.Create;

public class CreateEmployeeCommandHandler : IRequestHandler<CreateEmployeeCommand, Guid>
{
    private readonly IApplicationDbContext _context;

    public CreateEmployeeCommandHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<Guid> Handle(
        CreateEmployeeCommand request,
        CancellationToken cancellationToken)
    {
        var employeeCode = request.EmployeeCode.Trim().ToUpper();
        var phoneNumber = request.PhoneNumber.Trim();
        var email = string.IsNullOrWhiteSpace(request.Email)
            ? null
            : request.Email.Trim().ToLower();

        var employeeCodeExists = await _context.Employees
            .AnyAsync(x => x.EmployeeCode == employeeCode, cancellationToken);

        if (employeeCodeExists)
        {
            throw new Exception("Mã nhân viên đã tồn tại.");
        }

        var phoneExists = await _context.Employees
            .AnyAsync(x => x.PhoneNumber == phoneNumber, cancellationToken);

        if (phoneExists)
        {
            throw new Exception("Số điện thoại đã tồn tại.");
        }

        if (email != null)
        {
            var emailExists = await _context.Employees
                .AnyAsync(x => x.Email == email, cancellationToken);

            if (emailExists)
            {
                throw new Exception("Email đã tồn tại.");
            }
        }

        var employee = new Employee(
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

        _context.Employees.Add(employee);

        await _context.SaveChangesAsync(cancellationToken);

        return employee.Id;
    }
}