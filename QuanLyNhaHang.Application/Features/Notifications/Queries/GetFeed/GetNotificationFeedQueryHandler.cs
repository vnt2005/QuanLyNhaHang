using MediatR;
using Microsoft.EntityFrameworkCore;
using QuanLyNhaHang.Application.Common.Interfaces;
using QuanLyNhaHang.Application.Features.Notifications.DTOs;

namespace QuanLyNhaHang.Application.Features.Notifications.Queries.GetFeed;

public sealed class GetNotificationFeedQueryHandler
    : IRequestHandler<GetNotificationFeedQuery, NotificationFeedDto>
{
    private readonly IApplicationDbContext _context;
    private readonly ICurrentUserService _currentUserService;

    public GetNotificationFeedQueryHandler(
        IApplicationDbContext context,
        ICurrentUserService currentUserService)
    {
        _context = context;
        _currentUserService = currentUserService;
    }

    public async Task<NotificationFeedDto> Handle(
        GetNotificationFeedQuery request,
        CancellationToken cancellationToken)
    {
        var userId = _currentUserService.UserId
            ?? throw new UnauthorizedAccessException(
                "Không xác định được người dùng đang đăng nhập.");

        var limit = Math.Clamp(request.Limit, 1, 50);
        var query = _context.Notifications
            .AsNoTracking()
            .Where(notification => notification.UserId == userId);

        if (request.UnreadOnly)
            query = query.Where(notification => !notification.IsRead);

        var items = await query
            .OrderByDescending(notification => notification.CreatedAt)
            .Take(limit)
            .Select(notification => new NotificationDto
            {
                Id = notification.Id,
                UserId = notification.UserId,
                Type = notification.Type,
                Title = notification.Title,
                Message = notification.Message,
                Severity = notification.Severity,
                Target = notification.Target,
                EntityId = notification.EntityId,
                IsRead = notification.IsRead,
                ReadAt = notification.ReadAt,
                CreatedAt = notification.CreatedAt
            })
            .ToListAsync(cancellationToken);

        var unreadCount = await _context.Notifications
            .AsNoTracking()
            .CountAsync(
                notification =>
                    notification.UserId == userId &&
                    !notification.IsRead,
                cancellationToken);

        return new NotificationFeedDto
        {
            Items = items,
            UnreadCount = unreadCount
        };
    }
}
