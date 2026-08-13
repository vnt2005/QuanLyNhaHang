using MediatR;
using QuanLyNhaHang.Application.Features.Notifications.DTOs;

namespace QuanLyNhaHang.Application.Features.Notifications.Queries.GetFeed;

public sealed class GetNotificationFeedQuery : IRequest<NotificationFeedDto>
{
    public int Limit { get; init; } = 20;
    public bool UnreadOnly { get; init; }
}
