using MediatR;
using Microsoft.EntityFrameworkCore;
using QuanLyNhaHang.Application.Common.Constants;
using QuanLyNhaHang.Application.Common.Interfaces;
using QuanLyNhaHang.Application.Features.Auth.DTOs;
using QuanLyNhaHang.Domain.Entities;
using System.Security.Cryptography;

namespace QuanLyNhaHang.Application.Features.Auth.Commands.Register;

public class RegisterCommandHandler : IRequestHandler<RegisterCommand, AuthResponseDto>
{
    private readonly IApplicationDbContext _context;
    private readonly IPasswordHasher _passwordHasher;
    private readonly IEmailService _emailService;

    public RegisterCommandHandler(
        IApplicationDbContext context,
        IPasswordHasher passwordHasher,
        IEmailService emailService)
    {
        _context = context;
        _passwordHasher = passwordHasher;
        _emailService = emailService;
    }

    public async Task<AuthResponseDto> Handle(
        RegisterCommand request,
        CancellationToken cancellationToken)
    {
        var email = request.Email.Trim().ToLower();
        var phoneNumber = request.PhoneNumber.Trim();

        var emailExists = await _context.Users
            .AnyAsync(x => x.Email == email, cancellationToken);

        if (emailExists)
            throw new InvalidOperationException("Email đã tồn tại.");

        var phoneExists = await _context.Users
            .AnyAsync(x => x.PhoneNumber == phoneNumber, cancellationToken);

        if (phoneExists)
            throw new InvalidOperationException("Số điện thoại đã tồn tại.");

        var passwordHash = _passwordHasher.HashPassword(request.Password);

        var user = new User(
            request.Ho,
            request.Ten,
            email,
            phoneNumber,
            passwordHash,
            SystemRoles.Customer);

        var code = RandomNumberGenerator
            .GetInt32(0, 1_000_000)
            .ToString("D6");

        user.SetEmailVerificationCode(
            _passwordHasher.HashPassword(code),
            DateTime.UtcNow.AddMinutes(10));

        _context.Users.Add(user);
        await _context.SaveChangesAsync(cancellationToken);

        await _emailService.SendAsync(
            user.Email,
            "Xác minh địa chỉ email",
            $"Mã xác minh email của bạn là: {code}. " +
            "Mã này có hiệu lực trong 10 phút.");

        return new AuthResponseDto
        {
            UserId = user.Id,
            Ho = user.Ho,
            Ten = user.Ten,
            Email = user.Email,
            PhoneNumber = user.PhoneNumber,
            Role = user.Role,
            IsActive = user.IsActive,
            IsEmailVerified = user.IsEmailVerified,
            RequiresEmailVerification = true,
            TwoFactorEnabled = user.TwoFactorEnabled,
            RequiresTwoFactor = false,
            Message =
                "Đăng ký thành công. Vui lòng kiểm tra email để xác minh tài khoản."
        };
    }
}
