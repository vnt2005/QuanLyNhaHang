namespace QuanLyNhaHang.Api.Payments;

public sealed record SePayWebhookReadinessSnapshot(
    bool Required,
    bool Ready,
    DateTime? LastConfirmedAtUtc,
    DateTime? ValidUntilUtc);

public sealed class SePayWebhookReadiness
{
    private const int DefaultHeartbeatTimeoutSeconds = 35;
    private const int MinimumHeartbeatTimeoutSeconds = 15;
    private const int MaximumHeartbeatTimeoutSeconds = 300;

    private readonly TimeSpan _heartbeatTimeout;
    private long _lastConfirmedAtUtcTicks;

    public bool IsRequired { get; }

    public SePayWebhookReadiness(
        IConfiguration configuration,
        IHostEnvironment environment)
    {
        IsRequired =
            configuration.GetValue<bool?>("SePay:RequireWebhookReadiness") ??
            environment.IsDevelopment();

        var configuredTimeout = configuration.GetValue<int?>(
            "SePay:WebhookHeartbeatTimeoutSeconds");
        var timeoutSeconds = Math.Clamp(
            configuredTimeout ?? DefaultHeartbeatTimeoutSeconds,
            MinimumHeartbeatTimeoutSeconds,
            MaximumHeartbeatTimeoutSeconds);

        _heartbeatTimeout = TimeSpan.FromSeconds(timeoutSeconds);
    }

    public SePayWebhookReadinessSnapshot GetSnapshot()
    {
        var now = DateTime.UtcNow;
        var ticks = Interlocked.Read(ref _lastConfirmedAtUtcTicks);
        var lastConfirmedAtUtc = ticks > 0
            ? new DateTime(ticks, DateTimeKind.Utc)
            : (DateTime?)null;
        var validUntilUtc = lastConfirmedAtUtc?.Add(_heartbeatTimeout);
        var ready = !IsRequired ||
                    (validUntilUtc.HasValue && validUntilUtc.Value > now);

        return new SePayWebhookReadinessSnapshot(
            IsRequired,
            ready,
            lastConfirmedAtUtc,
            validUntilUtc);
    }

    public SePayWebhookReadinessSnapshot ConfirmExternalHeartbeat()
    {
        Interlocked.Exchange(
            ref _lastConfirmedAtUtcTicks,
            DateTime.UtcNow.Ticks);

        return GetSnapshot();
    }
}
