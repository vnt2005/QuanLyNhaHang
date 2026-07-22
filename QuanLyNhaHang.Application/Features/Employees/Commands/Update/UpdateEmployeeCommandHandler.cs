using MediatR;
using Microsoft.EntityFrameworkCore;
using QuanLyNhaHang.Application.Common.Constants;
using QuanLyNhaHang.Application.Common.Interfaces;
using QuanLyNhaHang.Domain.Entities;

namespace QuanLyNhaHang.Application.Features.Employees.Commands.Update;

public class UpdateEmployeeCommandHandler
    : IRequestHandler<UpdateEmployeeCommand, bool>
{
    private readonly IApplicationDbContext _context;
    private readonly IPasswordHasher _passwordHasher;
    private readonly IAuthSessionService _authSessionService;

    public UpdateEmployeeCommandHandler(
        IApplicationDbContext context,
        IPasswordHasher passwordHasher,
        IAuthSessionService authSessionService)
    {
        _context = context;
        _passwordHasher = passwordHasher;
        _authSessionService = authSessionService;
    }

    public async Task<bool> Handle(
        UpdateEmployeeCommand request,
        CancellationToken cancellationToken)
    {
        var employee = await _context.Employees
            .FirstOrDefaultAsync(
                x => x.Id == request.Id,
                cancellationToken);

        if (employee == null)
            throw new Exception("Không tìm thấy nhân viên.");

        if (string.IsNullOrWhiteSpace(request.Email))
            throw new ArgumentException(
                "Email đăng nhập không được để trống.");

        var employeeCode = request.EmployeeCode.Trim().ToUpper();
        var email = request.Email.Trim().ToLower();
        var phoneNumber = request.PhoneNumber.Trim();
        var role = SystemRoles.NormalizeEmployeeRole(request.Role);

        User? user = null;

        if (employee.UserId.HasValue)
        {
            user = await _context.Users
                .FirstOrDefaultAsync(
                    x => x.Id == employee.UserId.Value,
                    cancellationToken);
        }

        var currentUserId = user?.Id ?? Guid.Empty;
        var emailChanged = user != null &&
            !string.Equals(user.Email, email, StringComparison.Ordinal);

        var employeeCodeExists = await _context.Employees
            .AnyAsync(
                x => x.EmployeeCode == employeeCode &&
                     x.Id != employee.Id,
                cancellationToken);

        if (employeeCodeExists)
            throw new Exception("Mã nhân viên đã tồn tại.");

        var employeeEmailExists = await _context.Employees
            .AnyAsync(
                x => x.Email == email &&
                     x.Id != employee.Id,
                cancellationToken);

        if (employeeEmailExists)
            throw new Exception("Email đã được nhân viên khác sử dụng.");

        var employeePhoneExists = await _context.Employees
            .AnyAsync(
                x => x.PhoneNumber == phoneNumber &&
                     x.Id != employee.Id,
                cancellationToken);

        if (employeePhoneExists)
            throw new Exception(
                "Số điện thoại đã được nhân viên khác sử dụng.");

        var userEmailExists = await _context.Users
            .AnyAsync(
                x => x.Email == email &&
                     x.Id != currentUserId,
                cancellationToken);

        if (userEmailExists)
            throw new Exception("Email đăng nhập đã tồn tại.");

        var userPhoneExists = await _context.Users
            .AnyAsync(
                x => x.PhoneNumber == phoneNumber &&
                     x.Id != currentUserId,
                cancellationToken);

        if (userPhoneExists)
            throw new Exception(
                "Số điện thoại đăng nhập đã tồn tại.");

        // Tự động tạo tài khoản cho Employee cũ.
        if (user == null)
        {
            if (string.IsNullOrWhiteSpace(request.Password) ||
                request.Password.Length < 8)
            {
                throw new ArgumentException(
                    "Nhân viên cũ chưa có tài khoản. " +
                    "Hãy nhập mật khẩu có ít nhất 8 ký tự.");
            }

            var passwordHash = _passwordHasher.HashPassword(
                request.Password);

            user = new User(
                request.Ho,
                request.Ten,
                email,
                phoneNumber,
                passwordHash,
                role);

            // Hồ sơ nhân viên cũ đã được quản trị viên xác nhận.
            user.MarkEmailVerified();

            _context.Users.Add(user);
            employee.LinkUser(user.Id);
        }
        else
        {
            user.UpdateInfo(
                request.Ho,
                request.Ten,
                email,
                phoneNumber,
                role);

            if (!string.IsNullOrWhiteSpace(request.Password))
            {
                if (request.Password.Length < 8)
                    throw new ArgumentException(
                        "Mật khẩu phải có ít nhất 8 ký tự.");

                var passwordHash = _passwordHasher.HashPassword(
                    request.Password);

                user.ChangePassword(passwordHash);
            }
        }

        employee.UpdateInfo(
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

        if (request.IsActive)
        {
            employee.Activate();
            user.Activate();
        }
        else
        {
            employee.Deactivate();
            user.Deactivate();
        }

        await _context.SaveChangesAsync(cancellationToken);

        if (emailChanged)
        {
            await _authSessionService.RevokeAllAsync(
                user.Id,
                "Email đăng nhập đã thay đổi.",
                cancellationToken);
        }

        return true;
    }
}