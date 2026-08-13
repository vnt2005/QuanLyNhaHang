using MediatR;
using QuanLyNhaHang.Application.Features.Notifications.DTOs;

namespace QuanLyNhaHang.Application.Features.Notifications.Commands.MarkAsRead;

public sealed record MarkNotificationAsReadCommand(Guid Id)
    : IRequest<NotificationDto>;
