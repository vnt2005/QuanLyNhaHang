namespace QuanLyNhaHang.Application.Common.Interfaces;

public sealed record IssuedAuthSession(
    Guid SessionId,
    string RefreshToken,
    DateTime ExpiresAt);

public sealed record RotatedAuthSession(
    Guid UserId,
    Guid SessionId,
    string RefreshToken,
    DateTime ExpiresAt);

public sealed record AuthSessionSnapshot(
    Guid SessionId,
    DateTime CreatedAt,
    DateTime ExpiresAt,
    DateTime? LastUsedAt,
    DateTime? RevokedAt,
    string? RevocationReason,
    string? IpAddress,
    string? UserAgent);

public interface IAuthSessionService
{
    Task<IssuedAuthSession> CreateAsync(
        Guid userId,
        string? ipAddress,
        string? userAgent,
        CancellationToken cancellationToken = default);

    Task<RotatedAuthSession> RotateAsync(
        string refreshToken,
        string? ipAddress,
        string? userAgent,
        CancellationToken cancellationToken = default);

    Task<bool> RevokeByRefreshTokenAsync(
        string refreshToken,
        string reason,
        CancellationToken cancellationToken = default);

    Task<int> RevokeAllAsync(
        Guid userId,
        string reason,
        CancellationToken cancellationToken = default);

    Task<bool> RevokeSessionAsync(
        Guid userId,
        Guid sessionId,
        string reason,
        CancellationToken cancellationToken = default);

    Task<IReadOnlyCollection<AuthSessionSnapshot>> GetSessionsAsync(
        Guid userId,
        CancellationToken cancellationToken = default);

    Task<bool> IsActiveAsync(
        Guid userId,
        Guid sessionId,
        CancellationToken cancellationToken = default);
}
