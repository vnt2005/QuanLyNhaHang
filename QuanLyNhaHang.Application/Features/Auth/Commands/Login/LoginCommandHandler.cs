using MediatR;
using Microsoft.EntityFrameworkCore;
using QuanLyNhaHang.Application.Common.Interfaces;
using QuanLyNhaHang.Application.Features.Auth.DTOs;
using System.Security.Cryptography;

namespace QuanLyNhaHang.Application.Features.Auth.Commands.Login;

public class LoginCommandHandler : IRequestHandler<LoginCommand, AuthResponseDto>
{
    private readonly IApplicationDbContext _context;
    private readonly IPasswordHasher _passwordHasher;
    private readonly IJwtTokenService _jwtTokenService;
    private readonly IEmailService _emailService;
    private readonly IUserPermissionService _userPermissionService;

    public LoginCommandHandler(
        IApplicationDbContext context,
        IPasswordHasher passwordHasher,
        IJwtTokenService jwtTokenService,
        IEmailService emailService,
        IUserPermissionService userPermissionService)
    {
        _context = context;
        _passwordHasher = passwordHasher;
        _jwtTokenService = jwtTokenService;
        _emailService = emailService;
        _userPermissionService = userPermissionService;
    }

    public async Task<AuthResponseDto> Handle(
        LoginCommand request,
        CancellationToken cancellationToken)
    {
        var email = request.Email.Trim().ToLower();

        var user = await _context.Users
            .FirstOrDefaultAsync(x => x.Email == email, cancellationToken);

        if (user == null)
        {
            throw new Exception("Email hoặc mật khẩu không đúng.");
        }

        if (!user.IsActive)
        {
            throw new Exception("Tài khoản đã bị khóa.");
        }

        var passwordValid = _passwordHasher.VerifyPassword(
            request.Password,
            user.PasswordHash);

        if (!passwordValid)
        {
            throw new Exception("Email hoặc mật khẩu không đúng.");
        }

        if (user.TwoFactorEnabled)
        {
            var now = DateTime.UtcNow;

            if (user.IsTwoFactorLocked(now))
            {
                throw new UnauthorizedAccessException(
                    "Xác thực 2 yếu tố đang tạm khóa. " +
                    "Vui lòng thử lại sau 15 phút.");
            }

            var code = RandomNumberGenerator
                .GetInt32(0, 1_000_000)
                .ToString("D6");

            var codeHash = _passwordHasher.HashPassword(code);

            user.SetTwoFactorCode(
                codeHash,
                now.AddMinutes(5));

            await _context.SaveChangesAsync(cancellationToken);

            await _emailService.SendAsync(
                user.Email,
                "Mã xác thực đăng nhập",
                $"Mã xác thực đăng nhập của bạn là: {code}. " +
                "Mã này có hiệu lực trong 5 phút.");

            return new AuthResponseDto
            {
                UserId = user.Id,
                Ho = user.Ho,
                Ten = user.Ten,
                Email = user.Email,
                PhoneNumber = user.PhoneNumber,
                Role = user.Role,
                IsActive = user.IsActive,
                TwoFactorEnabled = true,
                RequiresTwoFactor = true,
                Token = string.Empty,
                Permissions = new List<string>(),
                Message = "Vui lòng kiểm tra email để lấy mã xác thực."
            };
        }

        var permissions = await _userPermissionService.GetPermissionsAsync(
            user.Role,
            cancellationToken);

        var token = _jwtTokenService.GenerateToken(user, permissions);

        return new AuthResponseDto
        {
            UserId = user.Id,
            Ho = user.Ho,
            Ten = user.Ten,
            Email = user.Email,
            PhoneNumber = user.PhoneNumber,
            Role = user.Role,
            IsActive = user.IsActive,
            TwoFactorEnabled = user.TwoFactorEnabled,
            RequiresTwoFactor = false,
            Token = token,
            Permissions = permissions.ToList(),
            Message = "Đăng nhập thành công."
        };
    }
}