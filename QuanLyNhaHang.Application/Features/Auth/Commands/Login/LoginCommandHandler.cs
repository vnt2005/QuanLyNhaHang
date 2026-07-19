using MediatR;
using Microsoft.EntityFrameworkCore;
using QuanLyNhaHang.Application.Common.Interfaces;
using QuanLyNhaHang.Application.Features.Auth.DTOs;

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
            var code = Random.Shared.Next(100000, 999999).ToString();

            user.SetTwoFactorCode(
                code,
                DateTime.UtcNow.AddMinutes(5));

            await _context.SaveChangesAsync(cancellationToken);

            await _emailService.SendAsync(
                user.Email,
                "Mã xác thực đăng nhập",
                $"Mã xác thực đăng nhập của bạn là: {code}. Mã này có hiệu lực trong 5 phút.");

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
                RequiresTwoFactor = true,
                Token = string.Empty,
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