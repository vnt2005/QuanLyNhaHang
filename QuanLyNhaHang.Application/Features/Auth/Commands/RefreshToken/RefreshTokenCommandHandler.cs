using MediatR;
using Microsoft.EntityFrameworkCore;
using QuanLyNhaHang.Application.Common.Interfaces;
using QuanLyNhaHang.Application.Features.Auth.DTOs;

namespace QuanLyNhaHang.Application.Features.Auth.Commands.RefreshToken;

public sealed class RefreshTokenCommandHandler
    : IRequestHandler<RefreshTokenCommand, AuthResponseDto>
{
    private readonly IApplicationDbContext _context;
    private readonly IAuthSessionService _authSessionService;
    private readonly IJwtTokenService _jwtTokenService;
    private readonly IUserPermissionService _userPermissionService;
    private readonly ICurrentUserService _currentUserService;

    public RefreshTokenCommandHandler(
        IApplicationDbContext context,
        IAuthSessionService authSessionService,
        IJwtTokenService jwtTokenService,
        IUserPermissionService userPermissionService,
        ICurrentUserService currentUserService)
    {
        _context = context;
        _authSessionService = authSessionService;
        _jwtTokenService = jwtTokenService;
        _userPermissionService = userPermissionService;
        _currentUserService = currentUserService;
    }

    public async Task<AuthResponseDto> Handle(
        RefreshTokenCommand request,
        CancellationToken cancellationToken)
    {
        var rotatedSession = await _authSessionService.RotateAsync(
            request.RefreshToken,
            _currentUserService.IpAddress,
            _currentUserService.UserAgent,
            cancellationToken);

        var user = await _context.Users
            .AsNoTracking()
            .FirstOrDefaultAsync(
                x => x.Id == rotatedSession.UserId,
                cancellationToken);

        if (user == null || !user.IsActive)
        {
            await _authSessionService.RevokeAllAsync(
                rotatedSession.UserId,
                "Tài khoản không còn hoạt động.",
                cancellationToken);

            throw new UnauthorizedAccessException(
                "Tài khoản không còn hoạt động.");
        }

        var permissions = await _userPermissionService.GetPermissionsAsync(
            user.Role,
            cancellationToken);

        var accessToken = _jwtTokenService.GenerateToken(
            user,
            rotatedSession.SessionId,
            permissions);

        return new AuthResponseDto
        {
            UserId = user.Id,
            SessionId = rotatedSession.SessionId,
            Ho = user.Ho,
            Ten = user.Ten,
            Email = user.Email,
            PhoneNumber = user.PhoneNumber,
            Role = user.Role,
            IsActive = user.IsActive,
            TwoFactorEnabled = user.TwoFactorEnabled,
            RequiresTwoFactor = false,
            Token = accessToken,
            RefreshToken = rotatedSession.RefreshToken,
            RefreshTokenExpiresAt = rotatedSession.ExpiresAt,
            Permissions = permissions.ToList(),
            Message = "Làm mới phiên đăng nhập thành công."
        };
    }
}
