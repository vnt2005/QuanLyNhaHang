using MediatR;
using Microsoft.EntityFrameworkCore;
using QuanLyNhaHang.Application.Common.Interfaces;
using QuanLyNhaHang.Application.Features.Auth.DTOs;

namespace QuanLyNhaHang.Application.Features.Auth.Queries.GetCurrentSession;

public sealed class GetCurrentSessionQueryHandler
    : IRequestHandler<GetCurrentSessionQuery, CurrentSessionDto>
{
    private readonly ICurrentUserService _currentUserService;
    private readonly IApplicationDbContext _context;
    private readonly IUserPermissionService _userPermissionService;

    public GetCurrentSessionQueryHandler(
        ICurrentUserService currentUserService,
        IApplicationDbContext context,
        IUserPermissionService userPermissionService)
    {
        _currentUserService = currentUserService;
        _context = context;
        _userPermissionService = userPermissionService;
    }

    public async Task<CurrentSessionDto> Handle(
        GetCurrentSessionQuery request,
        CancellationToken cancellationToken)
    {
        var userId = _currentUserService.UserId;
        var sessionId = _currentUserService.SessionId;

        if (!userId.HasValue || !sessionId.HasValue)
        {
            throw new UnauthorizedAccessException(
                "Không xác định được phiên đăng nhập hiện tại.");
        }

        var user = await _context.Users
            .AsNoTracking()
            .FirstOrDefaultAsync(x => x.Id == userId.Value, cancellationToken);

        if (user == null ||
            !user.IsActive ||
            !user.IsEmailVerified)
        {
            throw new UnauthorizedAccessException(
                "Tài khoản không tồn tại hoặc đã bị vô hiệu hóa.");
        }

        var permissions = await _userPermissionService
            .GetPermissionsAsync(user.Role, cancellationToken);

        return new CurrentSessionDto
        {
            UserId = user.Id,
            SessionId = sessionId.Value,
            Ho = user.Ho,
            Ten = user.Ten,
            Email = user.Email,
            PhoneNumber = user.PhoneNumber,
            Role = user.Role,
            IsActive = user.IsActive,
            IsEmailVerified = user.IsEmailVerified,
            TwoFactorEnabled = user.TwoFactorEnabled,
            Permissions = permissions
                .OrderBy(code => code, StringComparer.Ordinal)
                .ToList()
        };
    }
}
