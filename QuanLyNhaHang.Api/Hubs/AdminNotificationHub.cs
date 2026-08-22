using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;

namespace QuanLyNhaHang.Api.Hubs;

[Authorize]
public sealed class AdminNotificationHub : Hub
{
    public const string ReceiveEvent = "NotificationReceived";

    public static string UserGroup(Guid userId)
        => $"notification-user:{userId:N}";

    public override async Task OnConnectedAsync()
    {
        var userIdValue = Context.User?
            .FindFirstValue(ClaimTypes.NameIdentifier);

        if (!Guid.TryParse(userIdValue, out var userId))
        {
            Context.Abort();
            return;
        }

        await Groups.AddToGroupAsync(
            Context.ConnectionId,
            UserGroup(userId));

        await base.OnConnectedAsync();
    }
}
