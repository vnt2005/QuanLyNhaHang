using Microsoft.AspNetCore.SignalR;
using QuanLyNhaHang.Api.Hubs;
using QuanLyNhaHang.Api.RequestProtection;
using QuanLyNhaHang.Application.Common.Interfaces;
using QuanLyNhaHang.Application.Features.Notifications.DTOs;

namespace QuanLyNhaHang.Api.Services;

public sealed class SignalRAdminNotificationPublisher
    : IAdminNotificationPublisher
{
    private readonly IHubContext<AdminNotificationHub> _hubContext;
    private readonly ILogger<SignalRAdminNotificationPublisher> _logger;
    private readonly IHttpContextAccessor _httpContextAccessor;

    public SignalRAdminNotificationPublisher(
        IHubContext<AdminNotificationHub> hubContext,
        ILogger<SignalRAdminNotificationPublisher> logger,
        IHttpContextAccessor httpContextAccessor)
    {
        _hubContext = hubContext;
        _logger = logger;
        _httpContextAccessor = httpContextAccessor;
    }

    public async Task PublishAsync(
        IReadOnlyCollection<NotificationDto> notifications,
        CancellationToken cancellationToken = default)
    {
        if (notifications.Count == 0)
            return;

        var httpContext = _httpContextAccessor.HttpContext;
        if (httpContext?.Items.TryGetValue(
                DeferredNotificationContext.ItemKey,
                out var deferredValue) == true &&
            deferredValue is List<NotificationDto> deferredNotifications)
        {
            deferredNotifications.AddRange(notifications);
            return;
        }

        try
        {
            await Task.WhenAll(notifications.Select(notification =>
                _hubContext.Clients
                    .Group(AdminNotificationHub.UserGroup(notification.UserId))
                    .SendAsync(
                        AdminNotificationHub.ReceiveEvent,
                        notification,
                        cancellationToken)));
        }
        catch (OperationCanceledException)
            when (cancellationToken.IsCancellationRequested)
        {
            // Persisted notifications are loaded through the REST API later.
        }
        catch (Exception exception)
        {
            _logger.LogWarning(
                exception,
                "Không thể đẩy realtime {NotificationCount} thông báo. " +
                "Thông báo vẫn được lưu để tải lại qua API.",
                notifications.Count);
        }
    }
}
