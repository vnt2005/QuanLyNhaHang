using MediatR;
using Microsoft.EntityFrameworkCore;
using QuanLyNhaHang.Application.Common.Constants;
using QuanLyNhaHang.Application.Common.Interfaces;
using QuanLyNhaHang.Domain.Entities;

namespace QuanLyNhaHang.Application.Features.Employees.Commands.Create;

public class CreateEmployeeCommandHandler
    : IRequestHandler<CreateEmployeeCommand, Guid>
{
    private readonly IApplicationDbContext _context;
    private readonly IPasswordHasher _passwordHasher;

    public CreateEmployeeCommandHandler(
        IApplicationDbContext context,
        IPasswordHasher passwordHasher)
    {
        _context = context;
        _passwordHasher = passwordHasher;
    }

    public async Task<Guid> Handle(
        CreateEmployeeCommand request,
        CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(request.Email))
            throw new ArgumentException(
                "Email đăng nhập của nhân viên không được để trống.");

        if (string.IsNullOrWhiteSpace(request.Password) ||
            request.Password.Length < 8)
        {
            throw new ArgumentException(
                "Mật khẩu phải có ít nhất 8 ký tự.");
        }

        var employeeCode = request.EmployeeCode.Trim().ToUpper();
        var email = request.Email.Trim().ToLower();
        var phoneNumber = request.PhoneNumber.Trim();
        var role = SystemRoles.NormalizeEmployeeRole(request.Role);

        var employeeCodeExists = await _context.Employees
            .AnyAsync(
                x => x.EmployeeCode == employeeCode,
                cancellationToken);

        if (employeeCodeExists)
            throw new Exception("Mã nhân viên đã tồn tại.");

        var employeeEmailExists = await _context.Employees
            .AnyAsync(
                x => x.Email == email,
                cancellationToken);

        if (employeeEmailExists)
            throw new Exception("Email đã được sử dụng cho nhân viên khác.");

        var employeePhoneExists = await _context.Employees
            .AnyAsync(
                x => x.PhoneNumber == phoneNumber,
                cancellationToken);

        if (employeePhoneExists)
            throw new Exception(
                "Số điện thoại đã được sử dụng cho nhân viên khác.");

        var userEmailExists = await _context.Users
            .AnyAsync(
                x => x.Email == email,
                cancellationToken);

        if (userEmailExists)
            throw new Exception("Email đăng nhập đã tồn tại.");

        var userPhoneExists = await _context.Users
            .AnyAsync(
                x => x.PhoneNumber == phoneNumber,
                cancellationToken);

        if (userPhoneExists)
            throw new Exception(
                "Số điện thoại đăng nhập đã tồn tại.");

        var passwordHash = _passwordHasher.HashPassword(
            request.Password);

        var user = new User(
            request.Ho,
            request.Ten,
            email,
            phoneNumber,
            passwordHash,
            role);

        var employee = new Employee(
            user.Id,
            employeeCode,
            request.Ho,
            request.Ten,
            email,
            phoneNumber,
            request.DateOfBirth,
            request.Address,
            request.Position,
            request.BaseSalary,
            request.HireDate);

        _context.Users.Add(user);
        _context.Employees.Add(employee);

        // Một SaveChanges: User và Employee được lưu cùng giao dịch.
        await _context.SaveChangesAsync(cancellationToken);

        return employee.Id;
    }
}