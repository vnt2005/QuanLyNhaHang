using System.Collections.Concurrent;

namespace QuanLyNhaHang.Application.Common.Orders;

public sealed class AnonymousOrderAbuseGuard
{
    private readonly ConcurrentDictionary<string, AttemptState> _states =
        new(StringComparer.Ordinal);
    private long _operationCount;

    public AnonymousOrderAbuseDecision RegisterAttempt(
        string? ipAddress,
        string? clientId,
        string? idempotencyKey = null,
        DateTime? utcNow = null)
    {
        var now = utcNow ?? DateTime.UtcNow;
        var normalizedIp = string.IsNullOrWhiteSpace(ipAddress)
            ? "unknown"
            : ipAddress.Trim();
        var normalizedClientId = NormalizeClientId(clientId);
        var normalizedRequestKey = NormalizeRequestKey(idempotencyKey);

        var ipKey = $"ip:{normalizedIp}";
        var deviceKey = normalizedClientId is null
            ? null
            : $"client:{normalizedClientId}";

        var decisions = new List<AnonymousOrderAbuseDecision>(2);

        if (deviceKey is not null)
        {
            decisions.Add(RegisterForKey(
                deviceKey,
                CustomerOrderLimits.AnonymousDeviceOrderAttemptThreshold,
                normalizedRequestKey,
                now));
        }

        decisions.Add(RegisterForKey(
            ipKey,
            deviceKey is null
                ? CustomerOrderLimits.AnonymousDeviceOrderAttemptThreshold
                : CustomerOrderLimits.AnonymousIpOrderAttemptThreshold,
            normalizedRequestKey,
            now));

        var blocked = decisions
            .Where(decision => decision.IsBlocked)
            .OrderByDescending(decision => decision.RetryAfter)
            .FirstOrDefault();

        if (blocked.IsBlocked)
        {
            var blockUntil = now.Add(blocked.RetryAfter);
            ForceBlock(ipKey, blockUntil, now);
            if (deviceKey is not null)
                ForceBlock(deviceKey, blockUntil, now);
        }

        if (Interlocked.Increment(ref _operationCount) % 256 == 0)
            CleanupExpiredStates(now);

        return blocked.IsBlocked
            ? blocked
            : AnonymousOrderAbuseDecision.Allowed;
    }

    private AnonymousOrderAbuseDecision RegisterForKey(
        string key,
        int threshold,
        string? requestKey,
        DateTime now)
    {
        var state = _states.GetOrAdd(key, _ => new AttemptState());

        lock (state.SyncRoot)
        {
            state.LastSeenAt = now;

            if (state.BlockedUntil.HasValue && state.BlockedUntil.Value > now)
            {
                return AnonymousOrderAbuseDecision.Blocked(
                    state.BlockedUntil.Value - now);
            }

            state.BlockedUntil = null;
            Prune(state, now);

            if (requestKey is not null &&
                state.Attempts.Any(attempt => attempt.RequestKey == requestKey))
            {
                return AnonymousOrderAbuseDecision.Allowed;
            }

            state.Attempts.Enqueue(new AttemptRecord(now, requestKey));

            if (state.Attempts.Count < threshold)
                return AnonymousOrderAbuseDecision.Allowed;

            state.Attempts.Clear();
            state.BlockedUntil = now.Add(
                CustomerOrderLimits.AnonymousOrderBlockDuration);

            return AnonymousOrderAbuseDecision.Blocked(
                CustomerOrderLimits.AnonymousOrderBlockDuration);
        }
    }

    private void ForceBlock(string key, DateTime blockUntil, DateTime now)
    {
        var state = _states.GetOrAdd(key, _ => new AttemptState());

        lock (state.SyncRoot)
        {
            state.LastSeenAt = now;
            state.Attempts.Clear();
            if (!state.BlockedUntil.HasValue || state.BlockedUntil.Value < blockUntil)
                state.BlockedUntil = blockUntil;
        }
    }

    private static void Prune(AttemptState state, DateTime now)
    {
        var cutoff = now.Subtract(CustomerOrderLimits.AnonymousOrderAttemptWindow);
        while (state.Attempts.TryPeek(out var attempt) && attempt.CreatedAt < cutoff)
            state.Attempts.Dequeue();
    }

    private void CleanupExpiredStates(DateTime now)
    {
        var inactiveBefore = now.Subtract(
            CustomerOrderLimits.AnonymousOrderAttemptWindow +
            CustomerOrderLimits.AnonymousOrderBlockDuration);

        foreach (var pair in _states)
        {
            var state = pair.Value;
            lock (state.SyncRoot)
            {
                Prune(state, now);
                var blockExpired = !state.BlockedUntil.HasValue ||
                                   state.BlockedUntil.Value <= now;
                if (blockExpired &&
                    state.Attempts.Count == 0 &&
                    state.LastSeenAt < inactiveBefore)
                {
                    _states.TryRemove(pair.Key, out _);
                }
            }
        }
    }

    private static string? NormalizeClientId(string? value)
    {
        var clientId = value?.Trim();
        if (string.IsNullOrWhiteSpace(clientId) || clientId.Length is < 8 or > 128)
            return null;

        return clientId.All(character =>
            char.IsAsciiLetterOrDigit(character) ||
            character is '-' or '_' or '.')
            ? clientId
            : null;
    }

    private static string? NormalizeRequestKey(string? value)
    {
        var key = value?.Trim();
        return string.IsNullOrWhiteSpace(key) || key.Length > 128
            ? null
            : key;
    }

    private sealed class AttemptState
    {
        public object SyncRoot { get; } = new();
        public Queue<AttemptRecord> Attempts { get; } = new();
        public DateTime? BlockedUntil { get; set; }
        public DateTime LastSeenAt { get; set; }
    }

    private sealed record AttemptRecord(DateTime CreatedAt, string? RequestKey);
}

public readonly record struct AnonymousOrderAbuseDecision(
    bool IsBlocked,
    TimeSpan RetryAfter)
{
    public static AnonymousOrderAbuseDecision Allowed => new(false, TimeSpan.Zero);

    public static AnonymousOrderAbuseDecision Blocked(TimeSpan retryAfter)
        => new(true, retryAfter > TimeSpan.Zero ? retryAfter : TimeSpan.FromSeconds(1));
}
