using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.SignalR;
using QuanLyNhaHang.Application.Common.Constants;

namespace QuanLyNhaHang.Api.Hubs;

[Authorize(Roles = SystemRoles.AdminPortalRoles)]
public sealed class AdminNotificationHub : Hub
{
    public const string ReceiveEvent = "NotificationReceived";
}
