using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;

namespace QuanLyNhaHang.Api.Hubs;

[Authorize]
public sealed class AdminNotificationHub : Hub
{
    public const string ReceiveEvent = "NotificationReceived";
}
