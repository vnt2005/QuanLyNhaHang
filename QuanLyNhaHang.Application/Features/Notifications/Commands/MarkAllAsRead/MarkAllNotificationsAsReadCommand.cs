using MediatR;

namespace QuanLyNhaHang.Application.Features.Notifications.Commands.MarkAllAsRead;

public sealed record MarkAllNotificationsAsReadCommand : IRequest<int>;
