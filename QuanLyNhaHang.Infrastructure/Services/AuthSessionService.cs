using System.Data;
using System.Data.Common;
using System.Security.Cryptography;
using System.Text;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using QuanLyNhaHang.Application.Common.Interfaces;
using QuanLyNhaHang.Infrastructure.Persistence;

namespace QuanLyNhaHang.Infrastructure.Services;

public sealed class AuthSessionService : IAuthSessionService
{
    private const int TokenByteLength = 64;
    private const int MaxIpAddressLength = 100;
    private const int MaxUserAgentLength = 500;
    private const int MaxReasonLength = 200;

    private readonly ApplicationDbContext _context;
    private readonly int _refreshTokenDays;

    public AuthSessionService(
        ApplicationDbContext context,
        IConfiguration configuration)
    {
        _context = context;

        var configuredDays = configuration.GetValue<int?>(
            "Auth:RefreshTokenDays") ?? 30;
        _refreshTokenDays = Math.Clamp(configuredDays, 1, 90);
    }

    public async Task<IssuedAuthSession> CreateAsync(
        Guid userId,
        string? ipAddress,
        string? userAgent,
        CancellationToken cancellationToken = default)
    {
        if (userId == Guid.Empty)
            throw new ArgumentException("UserId của phiên đăng nhập không hợp lệ.");

        var now = DateTime.UtcNow;
        var sessionId = Guid.NewGuid();
        var refreshToken = GenerateRefreshToken();
        var expiresAt = now.AddDays(_refreshTokenDays);

        var connection = _context.Database.GetDbConnection();
        var shouldClose = await EnsureOpenAsync(connection, cancellationToken);

        try
        {
            await InsertSessionAsync(
                connection,
                transaction: null,
                sessionId,
                userId,
                HashToken(refreshToken),
                now,
                expiresAt,
                Normalize(ipAddress, MaxIpAddressLength),
                Normalize(userAgent, MaxUserAgentLength),
                cancellationToken);
        }
        finally
        {
            if (shouldClose)
                await connection.CloseAsync();
        }

        return new IssuedAuthSession(sessionId, refreshToken, expiresAt);
    }

    public async Task<RotatedAuthSession> RotateAsync(
        string refreshToken,
        string? ipAddress,
        string? userAgent,
        CancellationToken cancellationToken = default)
    {
        ValidateRefreshToken(refreshToken);

        var now = DateTime.UtcNow;
        var connection = _context.Database.GetDbConnection();
        var shouldClose = await EnsureOpenAsync(connection, cancellationToken);

        try
        {
            await using var transaction = await connection.BeginTransactionAsync(
                IsolationLevel.Serializable,
                cancellationToken);

            var existing = await FindByTokenHashAsync(
                connection,
                transaction,
                HashToken(refreshToken),
                cancellationToken);

            if (existing == null)
            {
                await transaction.RollbackAsync(cancellationToken);
                throw new UnauthorizedAccessException(
                    "Refresh token không hợp lệ hoặc đã hết hạn.");
            }

            if (existing.RevokedAt.HasValue)
            {
                if (existing.ReplacedBySessionId.HasValue)
                {
                    await RevokeAllInternalAsync(
                        connection,
                        transaction,
                        existing.UserId,
                        "Phát hiện refresh token đã được sử dụng lại.",
                        now,
                        cancellationToken);
                }

                await transaction.CommitAsync(cancellationToken);
                throw new UnauthorizedAccessException(
                    "Refresh token đã bị thu hồi.");
            }

            if (existing.ExpiresAt <= now)
            {
                await RevokeSessionInternalAsync(
                    connection,
                    transaction,
                    existing.UserId,
                    existing.SessionId,
                    "Refresh token đã hết hạn.",
                    now,
                    cancellationToken);
                await transaction.CommitAsync(cancellationToken);

                throw new UnauthorizedAccessException(
                    "Refresh token không hợp lệ hoặc đã hết hạn.");
            }

            var newSessionId = Guid.NewGuid();
            var newRefreshToken = GenerateRefreshToken();
            var newExpiresAt = now.AddDays(_refreshTokenDays);

            var rotated = await MarkRotatedAsync(
                connection,
                transaction,
                existing.SessionId,
                newSessionId,
                now,
                cancellationToken);

            if (!rotated)
            {
                await RevokeAllInternalAsync(
                    connection,
                    transaction,
                    existing.UserId,
                    "Phát hiện refresh token được sử dụng đồng thời.",
                    now,
                    cancellationToken);
                await transaction.CommitAsync(cancellationToken);

                throw new UnauthorizedAccessException(
                    "Refresh token đã bị thu hồi.");
            }

            await InsertSessionAsync(
                connection,
                transaction,
                newSessionId,
                existing.UserId,
                HashToken(newRefreshToken),
                now,
                newExpiresAt,
                Normalize(ipAddress, MaxIpAddressLength),
                Normalize(userAgent, MaxUserAgentLength),
                cancellationToken);

            await transaction.CommitAsync(cancellationToken);

            return new RotatedAuthSession(
                existing.UserId,
                newSessionId,
                newRefreshToken,
                newExpiresAt);
        }
        finally
        {
            if (shouldClose)
                await connection.CloseAsync();
        }
    }

    public async Task<bool> RevokeByRefreshTokenAsync(
        string refreshToken,
        string reason,
        CancellationToken cancellationToken = default)
    {
        if (string.IsNullOrWhiteSpace(refreshToken))
            return false;

        var connection = _context.Database.GetDbConnection();
        var shouldClose = await EnsureOpenAsync(connection, cancellationToken);

        try
        {
            await using var command = connection.CreateCommand();
            command.CommandText = """
                UPDATE [AuthSessions]
                SET [RevokedAt] = @now,
                    [RevocationReason] = @reason,
                    [LastUsedAt] = @now
                WHERE [TokenHash] = @tokenHash
                  AND [RevokedAt] IS NULL;
                """;
            AddParameter(command, "@now", DateTime.UtcNow);
            AddParameter(command, "@reason", NormalizeReason(reason));
            AddParameter(command, "@tokenHash", HashToken(refreshToken));

            return await command.ExecuteNonQueryAsync(cancellationToken) > 0;
        }
        finally
        {
            if (shouldClose)
                await connection.CloseAsync();
        }
    }

    public async Task<int> RevokeAllAsync(
        Guid userId,
        string reason,
        CancellationToken cancellationToken = default)
    {
        if (userId == Guid.Empty)
            return 0;

        var connection = _context.Database.GetDbConnection();
        var shouldClose = await EnsureOpenAsync(connection, cancellationToken);

        try
        {
            return await RevokeAllInternalAsync(
                connection,
                transaction: null,
                userId,
                reason,
                DateTime.UtcNow,
                cancellationToken);
        }
        finally
        {
            if (shouldClose)
                await connection.CloseAsync();
        }
    }

    public async Task<bool> RevokeSessionAsync(
        Guid userId,
        Guid sessionId,
        string reason,
        CancellationToken cancellationToken = default)
    {
        if (userId == Guid.Empty || sessionId == Guid.Empty)
            return false;

        var connection = _context.Database.GetDbConnection();
        var shouldClose = await EnsureOpenAsync(connection, cancellationToken);

        try
        {
            return await RevokeSessionInternalAsync(
                connection,
                transaction: null,
                userId,
                sessionId,
                reason,
                DateTime.UtcNow,
                cancellationToken);
        }
        finally
        {
            if (shouldClose)
                await connection.CloseAsync();
        }
    }

    public async Task<IReadOnlyCollection<AuthSessionSnapshot>> GetSessionsAsync(
        Guid userId,
        CancellationToken cancellationToken = default)
    {
        if (userId == Guid.Empty)
            return Array.Empty<AuthSessionSnapshot>();

        var connection = _context.Database.GetDbConnection();
        var shouldClose = await EnsureOpenAsync(connection, cancellationToken);

        try
        {
            await using var command = connection.CreateCommand();
            command.CommandText = """
                SELECT TOP (50)
                    [Id],
                    [CreatedAt],
                    [ExpiresAt],
                    [LastUsedAt],
                    [RevokedAt],
                    [RevocationReason],
                    [IpAddress],
                    [UserAgent]
                FROM [AuthSessions]
                WHERE [UserId] = @userId
                ORDER BY [CreatedAt] DESC;
                """;
            AddParameter(command, "@userId", userId);

            var result = new List<AuthSessionSnapshot>();

            await using var reader = await command.ExecuteReaderAsync(cancellationToken);
            while (await reader.ReadAsync(cancellationToken))
            {
                result.Add(new AuthSessionSnapshot(
                    reader.GetGuid(0),
                    reader.GetDateTime(1),
                    reader.GetDateTime(2),
                    ReadNullableDateTime(reader, 3),
                    ReadNullableDateTime(reader, 4),
                    ReadNullableString(reader, 5),
                    ReadNullableString(reader, 6),
                    ReadNullableString(reader, 7)));
            }

            return result;
        }
        finally
        {
            if (shouldClose)
                await connection.CloseAsync();
        }
    }

    public async Task<bool> IsActiveAsync(
        Guid userId,
        Guid sessionId,
        CancellationToken cancellationToken = default)
    {
        if (userId == Guid.Empty || sessionId == Guid.Empty)
            return false;

        var connection = _context.Database.GetDbConnection();
        var shouldClose = await EnsureOpenAsync(connection, cancellationToken);

        try
        {
            await using var command = connection.CreateCommand();
            command.CommandText = """
                SELECT COUNT(1)
                FROM [AuthSessions]
                WHERE [Id] = @sessionId
                  AND [UserId] = @userId
                  AND [RevokedAt] IS NULL
                  AND [ExpiresAt] > @now;
                """;
            AddParameter(command, "@sessionId", sessionId);
            AddParameter(command, "@userId", userId);
            AddParameter(command, "@now", DateTime.UtcNow);

            var value = await command.ExecuteScalarAsync(cancellationToken);
            return Convert.ToInt32(value) > 0;
        }
        finally
        {
            if (shouldClose)
                await connection.CloseAsync();
        }
    }

    private static async Task InsertSessionAsync(
        DbConnection connection,
        DbTransaction? transaction,
        Guid sessionId,
        Guid userId,
        string tokenHash,
        DateTime createdAt,
        DateTime expiresAt,
        string? ipAddress,
        string? userAgent,
        CancellationToken cancellationToken)
    {
        await using var command = connection.CreateCommand();
        command.Transaction = transaction;
        command.CommandText = """
            INSERT INTO [AuthSessions]
                ([Id], [UserId], [TokenHash], [CreatedAt], [ExpiresAt],
                 [LastUsedAt], [RevokedAt], [RevocationReason],
                 [ReplacedBySessionId], [IpAddress], [UserAgent])
            VALUES
                (@id, @userId, @tokenHash, @createdAt, @expiresAt,
                 NULL, NULL, NULL, NULL, @ipAddress, @userAgent);
            """;
        AddParameter(command, "@id", sessionId);
        AddParameter(command, "@userId", userId);
        AddParameter(command, "@tokenHash", tokenHash);
        AddParameter(command, "@createdAt", createdAt);
        AddParameter(command, "@expiresAt", expiresAt);
        AddParameter(command, "@ipAddress", ipAddress);
        AddParameter(command, "@userAgent", userAgent);

        await command.ExecuteNonQueryAsync(cancellationToken);
    }

    private static async Task<StoredSession?> FindByTokenHashAsync(
        DbConnection connection,
        DbTransaction transaction,
        string tokenHash,
        CancellationToken cancellationToken)
    {
        await using var command = connection.CreateCommand();
        command.Transaction = transaction;
        command.CommandText = """
            SELECT TOP (1)
                [Id], [UserId], [ExpiresAt], [RevokedAt], [ReplacedBySessionId]
            FROM [AuthSessions] WITH (UPDLOCK, ROWLOCK)
            WHERE [TokenHash] = @tokenHash;
            """;
        AddParameter(command, "@tokenHash", tokenHash);

        await using var reader = await command.ExecuteReaderAsync(cancellationToken);
        if (!await reader.ReadAsync(cancellationToken))
            return null;

        return new StoredSession(
            reader.GetGuid(0),
            reader.GetGuid(1),
            reader.GetDateTime(2),
            ReadNullableDateTime(reader, 3),
            ReadNullableGuid(reader, 4));
    }

    private static async Task<bool> MarkRotatedAsync(
        DbConnection connection,
        DbTransaction transaction,
        Guid oldSessionId,
        Guid newSessionId,
        DateTime now,
        CancellationToken cancellationToken)
    {
        await using var command = connection.CreateCommand();
        command.Transaction = transaction;
        command.CommandText = """
            UPDATE [AuthSessions]
            SET [RevokedAt] = @now,
                [RevocationReason] = @reason,
                [ReplacedBySessionId] = @newSessionId,
                [LastUsedAt] = @now
            WHERE [Id] = @oldSessionId
              AND [RevokedAt] IS NULL;
            """;
        AddParameter(command, "@now", now);
        AddParameter(command, "@reason", "Refresh token đã được xoay vòng.");
        AddParameter(command, "@newSessionId", newSessionId);
        AddParameter(command, "@oldSessionId", oldSessionId);

        return await command.ExecuteNonQueryAsync(cancellationToken) == 1;
    }

    private static async Task<int> RevokeAllInternalAsync(
        DbConnection connection,
        DbTransaction? transaction,
        Guid userId,
        string reason,
        DateTime now,
        CancellationToken cancellationToken)
    {
        await using var command = connection.CreateCommand();
        command.Transaction = transaction;
        command.CommandText = """
            UPDATE [AuthSessions]
            SET [RevokedAt] = @now,
                [RevocationReason] = @reason,
                [LastUsedAt] = @now
            WHERE [UserId] = @userId
              AND [RevokedAt] IS NULL;
            """;
        AddParameter(command, "@now", now);
        AddParameter(command, "@reason", NormalizeReason(reason));
        AddParameter(command, "@userId", userId);

        return await command.ExecuteNonQueryAsync(cancellationToken);
    }

    private static async Task<bool> RevokeSessionInternalAsync(
        DbConnection connection,
        DbTransaction? transaction,
        Guid userId,
        Guid sessionId,
        string reason,
        DateTime now,
        CancellationToken cancellationToken)
    {
        await using var command = connection.CreateCommand();
        command.Transaction = transaction;
        command.CommandText = """
            UPDATE [AuthSessions]
            SET [RevokedAt] = @now,
                [RevocationReason] = @reason,
                [LastUsedAt] = @now
            WHERE [Id] = @sessionId
              AND [UserId] = @userId
              AND [RevokedAt] IS NULL;
            """;
        AddParameter(command, "@now", now);
        AddParameter(command, "@reason", NormalizeReason(reason));
        AddParameter(command, "@sessionId", sessionId);
        AddParameter(command, "@userId", userId);

        return await command.ExecuteNonQueryAsync(cancellationToken) == 1;
    }

    private static async Task<bool> EnsureOpenAsync(
        DbConnection connection,
        CancellationToken cancellationToken)
    {
        if (connection.State == ConnectionState.Open)
            return false;

        await connection.OpenAsync(cancellationToken);
        return true;
    }

    private static string GenerateRefreshToken()
    {
        var bytes = RandomNumberGenerator.GetBytes(TokenByteLength);
        return Convert.ToBase64String(bytes)
            .TrimEnd('=')
            .Replace('+', '-')
            .Replace('/', '_');
    }

    private static string HashToken(string token)
    {
        var bytes = SHA256.HashData(Encoding.UTF8.GetBytes(token));
        return Convert.ToHexString(bytes);
    }

    private static void ValidateRefreshToken(string refreshToken)
    {
        if (string.IsNullOrWhiteSpace(refreshToken))
        {
            throw new UnauthorizedAccessException(
                "Refresh token không hợp lệ hoặc đã hết hạn.");
        }
    }

    private static string NormalizeReason(string reason)
    {
        return Normalize(reason, MaxReasonLength) ?? "Phiên đã bị thu hồi.";
    }

    private static string? Normalize(string? value, int maxLength)
    {
        if (string.IsNullOrWhiteSpace(value))
            return null;

        var normalized = value.Trim();
        return normalized.Length <= maxLength
            ? normalized
            : normalized[..maxLength];
    }

    private static void AddParameter(
        DbCommand command,
        string name,
        object? value)
    {
        var parameter = command.CreateParameter();
        parameter.ParameterName = name;
        parameter.Value = value ?? DBNull.Value;
        command.Parameters.Add(parameter);
    }

    private static DateTime? ReadNullableDateTime(DbDataReader reader, int ordinal)
    {
        return reader.IsDBNull(ordinal) ? null : reader.GetDateTime(ordinal);
    }

    private static Guid? ReadNullableGuid(DbDataReader reader, int ordinal)
    {
        return reader.IsDBNull(ordinal) ? null : reader.GetGuid(ordinal);
    }

    private static string? ReadNullableString(DbDataReader reader, int ordinal)
    {
        return reader.IsDBNull(ordinal) ? null : reader.GetString(ordinal);
    }

    private sealed record StoredSession(
        Guid SessionId,
        Guid UserId,
        DateTime ExpiresAt,
        DateTime? RevokedAt,
        Guid? ReplacedBySessionId);
}
