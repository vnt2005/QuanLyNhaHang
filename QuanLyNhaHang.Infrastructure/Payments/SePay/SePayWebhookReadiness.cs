using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Options;
using QuanLyNhaHang.Application.Common.Payments;

namespace QuanLyNhaHang.Infrastructure.Payments.SePay;

public sealed class SePayWebhookReadiness : IPaymentChannelReadiness
{
    private const int DefaultHeartbeatTimeoutSeconds = 35;
    private const int MinimumHeartbeatTimeoutSeconds = 15;
    private const int MaximumHeartbeatTimeoutSeconds = 300;

    private readonly TimeSpan _heartbeatTimeout;
    private long _lastConfirmedAtUtcTicks;

    public bool IsRequired { get; }

    public SePayWebhookReadiness(
        IOptions<SePayOptions> options,
        IConfiguration configuration)
    {
        var value = options.Value;
        var environmentName =
            configuration["ASPNETCORE_ENVIRONMENT"] ??
            configuration["DOTNET_ENVIRONMENT"];
        var isDevelopment = string.Equals(
            environmentName,
            "Development",
            StringComparison.OrdinalIgnoreCase);

        IsRequired = value.RequireWebhookReadiness ?? isDevelopment;

        var timeoutSeconds = Math.Clamp(
            value.WebhookHeartbeatTimeoutSeconds ??
            DefaultHeartbeatTimeoutSeconds,
            MinimumHeartbeatTimeoutSeconds,
            MaximumHeartbeatTimeoutSeconds);

        _heartbeatTimeout = TimeSpan.FromSeconds(timeoutSeconds);
    }

    public PaymentChannelReadinessSnapshot GetSnapshot()
    {
        var now = DateTime.UtcNow;
        var ticks = Interlocked.Read(ref _lastConfirmedAtUtcTicks);
        var lastConfirmedAtUtc = ticks > 0
            ? new DateTime(ticks, DateTimeKind.Utc)
            : (DateTime?)null;
        var validUntilUtc = lastConfirmedAtUtc?.Add(_heartbeatTimeout);
        var ready = !IsRequired ||
                    (validUntilUtc.HasValue && validUntilUtc.Value > now);

        return new PaymentChannelReadinessSnapshot(
            IsRequired,
            ready,
            lastConfirmedAtUtc,
            validUntilUtc);
    }

    public PaymentChannelReadinessSnapshot ConfirmExternalHeartbeat()
    {
        Interlocked.Exchange(
            ref _lastConfirmedAtUtcTicks,
            DateTime.UtcNow.Ticks);

        return GetSnapshot();
    }
}
