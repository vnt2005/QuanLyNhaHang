using System.Data;
using System.Security.Cryptography;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Storage;
using QuanLyNhaHang.Api.RequestProtection;
using QuanLyNhaHang.Application.Features.Notifications.DTOs;
using QuanLyNhaHang.Domain.Entities;
using QuanLyNhaHang.Infrastructure.Persistence;

namespace QuanLyNhaHang.Api.Middlewares;

public sealed class AtomicRequestMiddleware
{
    public const string IdempotencyHeaderName = "Idempotency-Key";
    public const string ClientIdHeaderName = "X-Client-Id";
    public const string ReplayedHeaderName = "Idempotency-Replayed";

    private static readonly JsonSerializerOptions JsonOptions =
        new(JsonSerializerDefaults.Web);

    private readonly RequestDelegate _next;
    private readonly ILogger<AtomicRequestMiddleware> _logger;

    public AtomicRequestMiddleware(
        RequestDelegate next,
        ILogger<AtomicRequestMiddleware> logger)
    {
        _next = next;
        _logger = logger;
    }

    public async Task InvokeAsync(
        HttpContext context,
        ApplicationDbContext dbContext,
        IAdminNotificationPublisher notificationPublisher)
    {
        if (HttpMethods.IsGet(context.Request.Method) ||
            HttpMethods.IsHead(context.Request.Method) ||
            HttpMethods.IsOptions(context.Request.Method) ||
            HttpMethods.IsTrace(context.Request.Method))
        {
            await _next(context);
            return;
        }

        var endpoint = context.GetEndpoint();
        var idempotent = endpoint?.Metadata
            .GetMetadata<IdempotentRequestAttribute>();
        var atomic = idempotent as AtomicRequestAttribute
                     ?? endpoint?.Metadata.GetMetadata<AtomicRequestAttribute>();

        if (atomic == null)
        {
            await _next(context);
            return;
        }

        PreparedIdempotency? prepared = null;
        if (idempotent != null)
        {
            prepared = await PrepareIdempotencyAsync(
                context,
                idempotent,
                context.RequestAborted);

            if (prepared == null)
                return;

            var existing = await FindExistingAsync(
                dbContext,
                prepared,
                context.RequestAborted);

            if (existing != null && existing.ExpiresAt > DateTime.UtcNow)
            {
                _logger.LogDebug(
                    "Xử lý lại idempotent request {Scope} cho {Actor}.",
                    prepared.Scope,
                    prepared.Actor);
                await ReplayOrRejectAsync(context, existing, prepared);
                return;
            }

            if (existing != null)
            {
                dbContext.IdempotencyRecords.Remove(existing);
                await dbContext.SaveChangesAsync(context.RequestAborted);
            }
        }

        IDbContextTransaction? transaction = null;
        IdempotencyRecord? record = null;

        try
        {
            if (dbContext.Database.IsRelational() &&
                dbContext.Database.CurrentTransaction == null)
            {
                transaction = await dbContext.Database.BeginTransactionAsync(
                    NormalizeIsolationLevel(atomic.IsolationLevel),
                    context.RequestAborted);
            }

            if (prepared != null)
            {
                record = new IdempotencyRecord(
                    prepared.Scope,
                    prepared.Actor,
                    prepared.Key,
                    prepared.RequestHash,
                    prepared.ExpiresAt);

                dbContext.IdempotencyRecords.Add(record);

                try
                {
                    // Persist first so the unique database index serializes
                    // concurrent retries before any business mutation runs.
                    await dbContext.SaveChangesAsync(context.RequestAborted);
                }
                catch (DbUpdateException)
                {
                    await RollbackAndDisposeAsync(transaction);
                    transaction = null;
                    dbContext.ChangeTracker.Clear();

                    var existing = await FindExistingAsync(
                        dbContext,
                        prepared,
                        context.RequestAborted);

                    if (existing == null)
                        throw;

                    _logger.LogDebug(
                        "Idempotent request đồng thời {Scope} của {Actor} " +
                        "được hợp nhất tại unique index.",
                        prepared.Scope,
                        prepared.Actor);
                    await ReplayOrRejectAsync(context, existing, prepared);
                    return;
                }
            }

            var originalBody = context.Response.Body;
            await using var responseBuffer = new MemoryStream();
            context.Response.Body = responseBuffer;

            var deferredNotifications = new List<NotificationDto>();
            context.Items[DeferredNotificationContext.ItemKey] =
                deferredNotifications;

            try
            {
                await _next(context);

                if (context.Response.StatusCode is >= 200 and < 400)
                {
                    if (record != null)
                    {
                        responseBuffer.Position = 0;
                        using var reader = new StreamReader(
                            responseBuffer,
                            Encoding.UTF8,
                            detectEncodingFromByteOrderMarks: true,
                            bufferSize: 1024,
                            leaveOpen: true);
                        var responseBody = await reader.ReadToEndAsync(
                            context.RequestAborted);

                        record.Complete(
                            context.Response.StatusCode,
                            context.Response.ContentType,
                            responseBody);
                    }

                    await dbContext.SaveChangesAsync(context.RequestAborted);

                    if (transaction != null)
                    {
                        await transaction.CommitAsync(context.RequestAborted);
                        await transaction.DisposeAsync();
                        transaction = null;
                    }

                    context.Items.Remove(DeferredNotificationContext.ItemKey);
                    if (deferredNotifications.Count > 0)
                    {
                        await notificationPublisher.PublishAsync(
                            deferredNotifications,
                            CancellationToken.None);
                    }
                }
                else
                {
                    await RollbackAndDisposeAsync(transaction);
                    transaction = null;
                    context.Items.Remove(
                        DeferredNotificationContext.ItemKey);

                    if (!dbContext.Database.IsRelational() && record != null)
                    {
                        await RemoveNonRelationalRecordAsync(
                            dbContext,
                            record);
                    }
                }

                responseBuffer.Position = 0;
                context.Response.Body = originalBody;
                await responseBuffer.CopyToAsync(
                    originalBody,
                    context.RequestAborted);
            }
            catch
            {
                context.Response.Body = originalBody;
                context.Items.Remove(DeferredNotificationContext.ItemKey);
                throw;
            }
        }
        catch
        {
            await RollbackAndDisposeAsync(transaction);
            transaction = null;

            if (!dbContext.Database.IsRelational() && record != null)
            {
                await RemoveNonRelationalRecordAsync(
                    dbContext,
                    record);
            }

            throw;
        }
        finally
        {
            if (transaction != null)
                await transaction.DisposeAsync();
        }
    }

    private static IsolationLevel NormalizeIsolationLevel(
        IsolationLevel isolationLevel)
    {
        return isolationLevel is IsolationLevel.ReadUncommitted or
            IsolationLevel.ReadCommitted or
            IsolationLevel.RepeatableRead or
            IsolationLevel.Serializable or
            IsolationLevel.Snapshot
            ? isolationLevel
            : IsolationLevel.Serializable;
    }

    private static async Task<PreparedIdempotency?> PrepareIdempotencyAsync(
        HttpContext context,
        IdempotentRequestAttribute options,
        CancellationToken cancellationToken)
    {
        var suppliedKey = context.Request.Headers[IdempotencyHeaderName]
            .ToString()
            .Trim();

        if (options.RequireKey && string.IsNullOrWhiteSpace(suppliedKey))
        {
            await WriteProblemAsync(
                context,
                StatusCodes.Status400BadRequest,
                $"Header {IdempotencyHeaderName} là bắt buộc cho thao tác này.",
                cancellationToken);
            return null;
        }

        if (!string.IsNullOrWhiteSpace(suppliedKey) &&
            !IsSafeKey(suppliedKey))
        {
            await WriteProblemAsync(
                context,
                StatusCodes.Status400BadRequest,
                $"Header {IdempotencyHeaderName} phải dài từ 8 đến 128 ký tự " +
                "và chỉ chứa chữ, số, dấu chấm, gạch dưới hoặc gạch ngang.",
                cancellationToken);
            return null;
        }

        var requestHash = await ComputeRequestHashAsync(
            context.Request,
            cancellationToken);
        var actor = ResolveActor(context);
        var hasClientKey = !string.IsNullOrWhiteSpace(suppliedKey);
        var useRequestHashFallback = !hasClientKey &&
            context.User.Identity?.IsAuthenticated != true;
        var key = hasClientKey
            ? suppliedKey
            : useRequestHashFallback
                ? $"auto-{requestHash}"
                : $"request-{Guid.NewGuid():N}";
        var lifetime = hasClientKey
            ? TimeSpan.FromMinutes(Math.Clamp(options.LifetimeMinutes, 1, 10_080))
            : useRequestHashFallback
                ? TimeSpan.FromSeconds(Math.Clamp(
                    options.FallbackWindowSeconds,
                    2,
                    120))
                : TimeSpan.FromSeconds(2);

        return new PreparedIdempotency(
            options.Scope,
            actor,
            key,
            requestHash,
            DateTime.UtcNow.Add(lifetime));
    }

    private static async Task<string> ComputeRequestHashAsync(
        HttpRequest request,
        CancellationToken cancellationToken)
    {
        request.EnableBuffering();
        request.Body.Position = 0;

        using var reader = new StreamReader(
            request.Body,
            Encoding.UTF8,
            detectEncodingFromByteOrderMarks: true,
            bufferSize: 4096,
            leaveOpen: true);
        var body = await reader.ReadToEndAsync(cancellationToken);
        request.Body.Position = 0;

        var canonical = string.Join(
            '\n',
            request.Method.ToUpperInvariant(),
            request.Path.Value ?? string.Empty,
            request.QueryString.Value ?? string.Empty,
            body);

        return Convert.ToHexString(
            SHA256.HashData(Encoding.UTF8.GetBytes(canonical)));
    }

    private static string ResolveActor(HttpContext context)
    {
        var userId = context.User.FindFirstValue(ClaimTypes.NameIdentifier);
        if (!string.IsNullOrWhiteSpace(userId))
            return $"user:{userId}";

        var clientId = context.Request.Headers[ClientIdHeaderName]
            .ToString()
            .Trim();
        if (IsSafeClientId(clientId))
            return $"client:{clientId}";

        return $"ip:{context.Connection.RemoteIpAddress?.ToString() ?? "unknown"}";
    }

    private static bool IsSafeKey(string value)
        => value.Length is >= 8 and <= 128 &&
           value.All(character =>
               char.IsAsciiLetterOrDigit(character) ||
               character is '-' or '_' or '.');

    private static bool IsSafeClientId(string value)
        => value.Length is >= 8 and <= 128 && IsSafeKey(value);

    private static Task<IdempotencyRecord?> FindExistingAsync(
        ApplicationDbContext dbContext,
        PreparedIdempotency prepared,
        CancellationToken cancellationToken)
    {
        return dbContext.IdempotencyRecords
            .FirstOrDefaultAsync(
                item =>
                    item.Scope == prepared.Scope &&
                    item.Actor == prepared.Actor &&
                    item.Key == prepared.Key,
                cancellationToken);
    }

    private static async Task ReplayOrRejectAsync(
        HttpContext context,
        IdempotencyRecord existing,
        PreparedIdempotency prepared)
    {
        if (!string.Equals(
                existing.RequestHash,
                prepared.RequestHash,
                StringComparison.Ordinal))
        {
            await WriteProblemAsync(
                context,
                StatusCodes.Status409Conflict,
                "Idempotency-Key đã được dùng cho một nội dung request khác.",
                context.RequestAborted);
            return;
        }

        if (!existing.IsCompleted)
        {
            context.Response.Headers["Retry-After"] = "1";
            await WriteProblemAsync(
                context,
                StatusCodes.Status409Conflict,
                "Request cùng Idempotency-Key đang được xử lý. Vui lòng thử lại sau.",
                context.RequestAborted);
            return;
        }

        context.Response.StatusCode = existing.StatusCode!.Value;
        context.Response.ContentType = existing.ContentType;
        context.Response.Headers[ReplayedHeaderName] = "true";
        await context.Response.WriteAsync(
            existing.ResponseBody ?? string.Empty,
            context.RequestAborted);
    }

    private static async Task WriteProblemAsync(
        HttpContext context,
        int statusCode,
        string detail,
        CancellationToken cancellationToken)
    {
        context.Response.StatusCode = statusCode;
        context.Response.ContentType =
            "application/problem+json; charset=utf-8";

        await JsonSerializer.SerializeAsync(
            context.Response.Body,
            new
            {
                type = "about:blank",
                title = statusCode == StatusCodes.Status409Conflict
                    ? "Xung đột request"
                    : "Yêu cầu không hợp lệ",
                status = statusCode,
                detail,
                message = detail,
                traceId = context.TraceIdentifier
            },
            JsonOptions,
            cancellationToken);
    }

    private static async Task RollbackAndDisposeAsync(
        IDbContextTransaction? transaction)
    {
        if (transaction == null)
            return;

        try
        {
            await transaction.RollbackAsync(CancellationToken.None);
        }
        finally
        {
            await transaction.DisposeAsync();
        }
    }

    private static async Task RemoveNonRelationalRecordAsync(
        ApplicationDbContext dbContext,
        IdempotencyRecord record)
    {
        dbContext.ChangeTracker.Clear();
        dbContext.IdempotencyRecords.Attach(record);
        dbContext.IdempotencyRecords.Remove(record);
        await dbContext.SaveChangesAsync(CancellationToken.None);
    }

    private sealed record PreparedIdempotency(
        string Scope,
        string Actor,
        string Key,
        string RequestHash,
        DateTime ExpiresAt);
}
