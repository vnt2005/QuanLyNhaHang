namespace QuanLyNhaHang.Application.Features.Notifications.DTOs;

public sealed class NotificationFeedDto
{
    public IReadOnlyCollection<NotificationDto> Items { get; init; } =
        Array.Empty<NotificationDto>();

    public int UnreadCount { get; init; }
}
