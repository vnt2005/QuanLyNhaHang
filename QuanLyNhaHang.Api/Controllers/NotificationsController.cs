using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using QuanLyNhaHang.Application.Features.Notifications.Commands.MarkAllAsRead;
using QuanLyNhaHang.Application.Features.Notifications.Commands.MarkAsRead;
using QuanLyNhaHang.Application.Features.Notifications.Queries.GetFeed;

namespace QuanLyNhaHang.Api.Controllers;

[ApiController]
[Route("api/notifications")]
[Authorize]
public sealed class NotificationsController : ControllerBase
{
    private readonly IMediator _mediator;

    public NotificationsController(IMediator mediator)
    {
        _mediator = mediator;
    }

    [HttpGet]
    public async Task<IActionResult> GetFeed(
        [FromQuery] int limit = 20,
        [FromQuery] bool unreadOnly = false,
        CancellationToken cancellationToken = default)
    {
        var result = await _mediator.Send(
            new GetNotificationFeedQuery
            {
                Limit = limit,
                UnreadOnly = unreadOnly
            },
            cancellationToken);

        return Ok(result);
    }

    [HttpPatch("{id:guid}/read")]
    public async Task<IActionResult> MarkAsRead(
        Guid id,
        CancellationToken cancellationToken)
    {
        var result = await _mediator.Send(
            new MarkNotificationAsReadCommand(id),
            cancellationToken);

        return Ok(new { success = true, data = result });
    }

    [HttpPatch("read-all")]
    public async Task<IActionResult> MarkAllAsRead(
        CancellationToken cancellationToken)
    {
        var updatedCount = await _mediator.Send(
            new MarkAllNotificationsAsReadCommand(),
            cancellationToken);

        return Ok(new { success = true, updatedCount });
    }
}
