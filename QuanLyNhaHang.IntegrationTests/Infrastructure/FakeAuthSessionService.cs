using System.Security.Cryptography;
using System.Text;
using QuanLyNhaHang.Application.Common.Interfaces;

namespace QuanLyNhaHang.IntegrationTests.Infrastructure;

public sealed class FakeAuthSessionService : IAuthSessionService
{
    private readonly object _sync = new();
    private readonly Dictionary<Guid, FakeSession> _sessions = new();

    public Task<IssuedAuthSession> CreateAsync(
        Guid userId,
        string? ipAddress,
        string? userAgent,
        CancellationToken cancellationToken = default)
    {
        lock (_sync)
        {
            var session = CreateSession(userId, ipAddress, userAgent);
            _sessions.Add(session.SessionId, session);

            return Task.FromResult(new IssuedAuthSession(
                session.SessionId,
                session.RawToken,
                session.ExpiresAt));
        }
    }

    public Task<RotatedAuthSession> RotateAsync(
        string refreshToken,
        string? ipAddress,
        string? userAgent,
        CancellationToken cancellationToken = default)
    {
        lock (_sync)
        {
            var tokenHash = HashToken(refreshToken);
            var existing = _sessions.Values.FirstOrDefault(
                session => session.TokenHash == tokenHash);

            if (existing == null)
            {
                throw new UnauthorizedAccessException(
                    "Refresh token không hợp lệ hoặc đã hết hạn.");
            }

            if (existing.RevokedAt.HasValue)
            {
                if (existing.ReplacedBySessionId.HasValue)
                {
                    RevokeAllInternal(
                        existing.UserId,
                        "Phát hiện refresh token đã được sử dụng lại.");
                }

                throw new UnauthorizedAccessException(
                    "Refresh token đã bị thu hồi.");
            }

            if (existing.ExpiresAt <= DateTime.UtcNow)
            {
                RevokeInternal(existing, "Refresh token đã hết hạn.");
                throw new UnauthorizedAccessException(
                    "Refresh token không hợp lệ hoặc đã hết hạn.");
            }

            var replacement = CreateSession(
                existing.UserId,
                ipAddress,
                userAgent);

            existing.RevokedAt = DateTime.UtcNow;
            existing.LastUsedAt = existing.RevokedAt;
            existing.RevocationReason = "Refresh token đã được xoay vòng.";
            existing.ReplacedBySessionId = replacement.SessionId;
            _sessions.Add(replacement.SessionId, replacement);

            return Task.FromResult(new RotatedAuthSession(
                replacement.UserId,
                replacement.SessionId,
                replacement.RawToken,
                replacement.ExpiresAt));
        }
    }

    public Task<bool> RevokeByRefreshTokenAsync(
        string refreshToken,
        string reason,
        CancellationToken cancellationToken = default)
    {
        lock (_sync)
        {
            if (string.IsNullOrWhiteSpace(refreshToken))
                return Task.FromResult(false);

            var tokenHash = HashToken(refreshToken);
            var session = _sessions.Values.FirstOrDefault(
                item => item.TokenHash == tokenHash && !item.RevokedAt.HasValue);

            if (session == null)
                return Task.FromResult(false);

            RevokeInternal(session, reason);
            return Task.FromResult(true);
        }
    }

    public Task<int> RevokeAllAsync(
        Guid userId,
        string reason,
        CancellationToken cancellationToken = default)
    {
        lock (_sync)
        {
            return Task.FromResult(RevokeAllInternal(userId, reason));
        }
    }

    public Task<bool> RevokeSessionAsync(
        Guid userId,
        Guid sessionId,
        string reason,
        CancellationToken cancellationToken = default)
    {
        lock (_sync)
        {
            if (!_sessions.TryGetValue(sessionId, out var session) ||
                session.UserId != userId ||
                session.RevokedAt.HasValue)
            {
                return Task.FromResult(false);
            }

            RevokeInternal(session, reason);
            return Task.FromResult(true);
        }
    }

    public Task<IReadOnlyCollection<AuthSessionSnapshot>> GetSessionsAsync(
        Guid userId,
        CancellationToken cancellationToken = default)
    {
        lock (_sync)
        {
            IReadOnlyCollection<AuthSessionSnapshot> result = _sessions.Values
                .Where(session => session.UserId == userId)
                .OrderByDescending(session => session.CreatedAt)
                .Take(50)
                .Select(session => new AuthSessionSnapshot(
                    session.SessionId,
                    session.CreatedAt,
                    session.ExpiresAt,
                    session.LastUsedAt,
                    session.RevokedAt,
                    session.RevocationReason,
                    session.IpAddress,
                    session.UserAgent))
                .ToList();

            return Task.FromResult(result);
        }
    }

    public Task<bool> IsActiveAsync(
        Guid userId,
        Guid sessionId,
        CancellationToken cancellationToken = default)
    {
        lock (_sync)
        {
            var active = _sessions.TryGetValue(sessionId, out var session) &&
                         session.UserId == userId &&
                         !session.RevokedAt.HasValue &&
                         session.ExpiresAt > DateTime.UtcNow;

            return Task.FromResult(active);
        }
    }

    private FakeSession CreateSession(
        Guid userId,
        string? ipAddress,
        string? userAgent)
    {
        var rawToken = Convert.ToHexString(RandomNumberGenerator.GetBytes(64));
        var now = DateTime.UtcNow;

        return new FakeSession
        {
            SessionId = Guid.NewGuid(),
            UserId = userId,
            RawToken = rawToken,
            TokenHash = HashToken(rawToken),
            CreatedAt = now,
            ExpiresAt = now.AddDays(30),
            IpAddress = ipAddress,
            UserAgent = userAgent
        };
    }

    private int RevokeAllInternal(Guid userId, string reason)
    {
        var activeSessions = _sessions.Values
            .Where(session =>
                session.UserId == userId &&
                !session.RevokedAt.HasValue)
            .ToList();

        foreach (var session in activeSessions)
            RevokeInternal(session, reason);

        return activeSessions.Count;
    }

    private static void RevokeInternal(FakeSession session, string reason)
    {
        var now = DateTime.UtcNow;
        session.RevokedAt = now;
        session.LastUsedAt = now;
        session.RevocationReason = reason;
    }

    private static string HashToken(string token)
    {
        var bytes = SHA256.HashData(Encoding.UTF8.GetBytes(token));
        return Convert.ToHexString(bytes);
    }

    private sealed class FakeSession
    {
        public Guid SessionId { get; init; }
        public Guid UserId { get; init; }
        public string RawToken { get; init; } = string.Empty;
        public string TokenHash { get; init; } = string.Empty;
        public DateTime CreatedAt { get; init; }
        public DateTime ExpiresAt { get; init; }
        public DateTime? LastUsedAt { get; set; }
        public DateTime? RevokedAt { get; set; }
        public string? RevocationReason { get; set; }
        public Guid? ReplacedBySessionId { get; set; }
        public string? IpAddress { get; init; }
        public string? UserAgent { get; init; }
    }
}
