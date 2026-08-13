using MediatR;
using Microsoft.EntityFrameworkCore;
using QuanLyNhaHang.Application.Common.Interfaces;
using QuanLyNhaHang.Application.Features.Notifications.DTOs;

namespace QuanLyNhaHang.Application.Features.Notifications.Commands.MarkAsRead;

public sealed class MarkNotificationAsReadCommandHandler
    : IRequestHandler<MarkNotificationAsReadCommand, NotificationDto>
{
    private readonly IApplicationDbContext _context;
    private readonly ICurrentUserService _currentUserService;

    public MarkNotificationAsReadCommandHandler(
        IApplicationDbContext context,
        ICurrentUserService currentUserService)
    {
        _context = context;
        _currentUserService = currentUserService;
    }

    public async Task<NotificationDto> Handle(
        MarkNotificationAsReadCommand request,
        CancellationToken cancellationToken)
    {
        var userId = _currentUserService.UserId
            ?? throw new UnauthorizedAccessException(
                "Không xác định được người dùng đang đăng nhập.");

        var notification = await _context.Notifications
            .FirstOrDefaultAsync(
                item => item.Id == request.Id && item.UserId == userId,
                cancellationToken)
            ?? throw new KeyNotFoundException("Không tìm thấy thông báo.");

        if (!notification.IsRead)
        {
            notification.MarkAsRead(DateTime.UtcNow);
            await _context.SaveChangesAsync(cancellationToken);
        }

        return NotificationDto.FromEntity(notification);
    }
}
