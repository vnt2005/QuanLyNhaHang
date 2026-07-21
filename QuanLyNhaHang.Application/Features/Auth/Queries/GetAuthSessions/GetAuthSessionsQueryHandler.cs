using MediatR;
using QuanLyNhaHang.Application.Common.Interfaces;
using QuanLyNhaHang.Application.Features.Auth.DTOs;

namespace QuanLyNhaHang.Application.Features.Auth.Queries.GetAuthSessions;

public sealed class GetAuthSessionsQueryHandler
    : IRequestHandler<GetAuthSessionsQuery, IReadOnlyCollection<AuthSessionDto>>
{
    private readonly ICurrentUserService _currentUserService;
    private readonly IAuthSessionService _authSessionService;

    public GetAuthSessionsQueryHandler(
        ICurrentUserService currentUserService,
        IAuthSessionService authSessionService)
    {
        _currentUserService = currentUserService;
        _authSessionService = authSessionService;
    }

    public async Task<IReadOnlyCollection<AuthSessionDto>> Handle(
        GetAuthSessionsQuery request,
        CancellationToken cancellationToken)
    {
        var userId = _currentUserService.UserId;

        if (!userId.HasValue)
        {
            throw new UnauthorizedAccessException(
                "Không xác định được người dùng hiện tại.");
        }

        var currentSessionId = _currentUserService.SessionId;
        var sessions = await _authSessionService.GetSessionsAsync(
            userId.Value,
            cancellationToken);
        var now = DateTime.UtcNow;

        return sessions
            .Select(session => new AuthSessionDto
            {
                SessionId = session.SessionId,
                CreatedAt = session.CreatedAt,
                ExpiresAt = session.ExpiresAt,
                LastUsedAt = session.LastUsedAt,
                RevokedAt = session.RevokedAt,
                RevocationReason = session.RevocationReason,
                IpAddress = session.IpAddress,
                UserAgent = session.UserAgent,
                IsActive = !session.RevokedAt.HasValue && session.ExpiresAt > now,
                IsCurrent = currentSessionId == session.SessionId
            })
            .ToList();
    }
}
