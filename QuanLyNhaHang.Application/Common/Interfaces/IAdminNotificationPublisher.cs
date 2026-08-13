using QuanLyNhaHang.Application.Features.Notifications.DTOs;

namespace QuanLyNhaHang.Application.Common.Interfaces;

public interface IAdminNotificationPublisher
{
    Task PublishAsync(
        IReadOnlyCollection<NotificationDto> notifications,
        CancellationToken cancellationToken = default);
}
