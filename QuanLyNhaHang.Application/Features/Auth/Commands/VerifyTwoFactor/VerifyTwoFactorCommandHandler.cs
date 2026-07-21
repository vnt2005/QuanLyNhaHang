using MediatR;
using Microsoft.EntityFrameworkCore;
using QuanLyNhaHang.Application.Common.Interfaces;
using QuanLyNhaHang.Application.Features.Auth.DTOs;

namespace QuanLyNhaHang.Application.Features.Auth.Commands.VerifyTwoFactor;

public class VerifyTwoFactorCommandHandler
    : IRequestHandler<VerifyTwoFactorCommand, AuthResponseDto>
{
    private const string InvalidCodeMessage =
        "Mã xác thực không đúng hoặc đã hết hạn.";

    private readonly IApplicationDbContext _context;
    private readonly IJwtTokenService _jwtTokenService;
    private readonly IUserPermissionService _userPermissionService;
    private readonly IPasswordHasher _passwordHasher;
    private readonly IAuthSessionService _authSessionService;
    private readonly ICurrentUserService _currentUserService;

    public VerifyTwoFactorCommandHandler(
        IApplicationDbContext context,
        IJwtTokenService jwtTokenService,
        IUserPermissionService userPermissionService,
        IPasswordHasher passwordHasher,
        IAuthSessionService authSessionService,
        ICurrentUserService currentUserService)
    {
        _context = context;
        _jwtTokenService = jwtTokenService;
        _userPermissionService = userPermissionService;
        _passwordHasher = passwordHasher;
        _authSessionService = authSessionService;
        _currentUserService = currentUserService;
    }

    public async Task<AuthResponseDto> Handle(
        VerifyTwoFactorCommand request,
        CancellationToken cancellationToken)
    {
        var email = request.Email.Trim().ToLower();

        var user = await _context.Users
            .FirstOrDefaultAsync(
                x => x.Email == email,
                cancellationToken);

        if (user == null ||
            !user.IsActive ||
            !user.TwoFactorEnabled)
        {
            throw new UnauthorizedAccessException(
                InvalidCodeMessage);
        }

        var now = DateTime.UtcNow;

        if (user.IsTwoFactorLocked(now))
        {
            throw new UnauthorizedAccessException(
                "Xác thực đang tạm khóa. Vui lòng thử lại sau.");
        }

        var codeValid =
            user.HasActiveTwoFactorCode(now) &&
            _passwordHasher.VerifyPassword(
                request.Code,
                user.TwoFactorCode!);

        if (!codeValid)
        {
            user.RegisterTwoFactorFailure(now);

            await _context.SaveChangesAsync(cancellationToken);

            throw new UnauthorizedAccessException(
                InvalidCodeMessage);
        }

        user.ClearTwoFactorCode();
        await _context.SaveChangesAsync(cancellationToken);

        var permissions =
            await _userPermissionService.GetPermissionsAsync(
                user.Role,
                cancellationToken);

        var session = await _authSessionService.CreateAsync(
            user.Id,
            _currentUserService.IpAddress,
            _currentUserService.UserAgent,
            cancellationToken);

        var token = _jwtTokenService.GenerateToken(
            user,
            session.SessionId,
            permissions);

        return new AuthResponseDto
        {
            UserId = user.Id,
            SessionId = session.SessionId,
            Ho = user.Ho,
            Ten = user.Ten,
            Email = user.Email,
            PhoneNumber = user.PhoneNumber,
            Role = user.Role,
            IsActive = user.IsActive,
            TwoFactorEnabled = user.TwoFactorEnabled,
            RequiresTwoFactor = false,
            Token = token,
            RefreshToken = session.RefreshToken,
            RefreshTokenExpiresAt = session.ExpiresAt,
            Permissions = permissions.ToList(),
            Message = "Xác thực 2 yếu tố thành công."
        };
    }
}
