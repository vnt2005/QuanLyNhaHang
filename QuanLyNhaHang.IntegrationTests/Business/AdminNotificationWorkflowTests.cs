using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using QuanLyNhaHang.Application.Common.Constants;
using QuanLyNhaHang.Domain.Entities;
using QuanLyNhaHang.Infrastructure.Persistence;
using QuanLyNhaHang.IntegrationTests.Infrastructure;
using Xunit;

namespace QuanLyNhaHang.IntegrationTests.Business;

public sealed class AdminNotificationWorkflowTests
{
    [Fact]
    public async Task Admin_CanReadOwnFeedAndMarkNotificationsAsRead()
    {
        using var factory = new ApiWebApplicationFactory();
        using var client = factory.CreateHttpsClient();
        var firstAdminId = await AuthenticateAsync(
            factory,
            client,
            SystemRoles.Admin);
        var otherAdminId = await factory.SeedUserAsync(
            $"notification-other-{Guid.NewGuid():N}@example.com",
            "Password123!",
            role: SystemRoles.Admin);

        Guid firstNotificationId;

        using (var scope = factory.Services.CreateScope())
        {
            var context = scope.ServiceProvider
                .GetRequiredService<ApplicationDbContext>();

            var firstNotification = new Notification(
                firstAdminId,
                "Order.CreatedFromCustomer",
                "Đơn gọi món mới",
                "Bàn 01 vừa gửi một đơn mới.",
                "info",
                "Đơn hàng",
                Guid.NewGuid());
            var otherNotification = new Notification(
                otherAdminId,
                "Reservation.CreatedFromCustomer",
                "Yêu cầu đặt bàn mới",
                "Khách hàng vừa gửi yêu cầu đặt bàn.",
                "warning",
                "Đặt bàn",
                Guid.NewGuid());

            firstNotificationId = firstNotification.Id;
            context.Notifications.AddRange(
                firstNotification,
                otherNotification);
            await context.SaveChangesAsync();
        }

        using var feedResponse = await client.GetAsync(
            "/api/notifications?limit=20");
        Assert.Equal(HttpStatusCode.OK, feedResponse.StatusCode);

        using var feedJson = await ReadJsonAsync(feedResponse);
        Assert.Equal(
            1,
            feedJson.RootElement.GetProperty("unreadCount").GetInt32());
        var item = Assert.Single(
            feedJson.RootElement.GetProperty("items").EnumerateArray());
        Assert.Equal(
            firstNotificationId,
            item.GetProperty("id").GetGuid());

        using var markResponse = await client.PatchAsync(
            $"/api/notifications/{firstNotificationId}/read",
            null);
        Assert.Equal(HttpStatusCode.OK, markResponse.StatusCode);

        using var unreadResponse = await client.GetAsync(
            "/api/notifications?unreadOnly=true");
        Assert.Equal(HttpStatusCode.OK, unreadResponse.StatusCode);

        using var unreadJson = await ReadJsonAsync(unreadResponse);
        Assert.Equal(
            0,
            unreadJson.RootElement.GetProperty("unreadCount").GetInt32());
        Assert.Empty(
            unreadJson.RootElement.GetProperty("items").EnumerateArray());

        using var verificationScope = factory.Services.CreateScope();
        var verificationContext = verificationScope.ServiceProvider
            .GetRequiredService<ApplicationDbContext>();
        var persisted = await verificationContext.Notifications
            .AsNoTracking()
            .SingleAsync(notification =>
                notification.Id == firstNotificationId);

        Assert.True(persisted.IsRead);
        Assert.NotNull(persisted.ReadAt);
    }

    [Fact]
    public async Task Customer_CannotAccessAdminNotificationFeed()
    {
        using var factory = new ApiWebApplicationFactory();
        using var client = factory.CreateHttpsClient();
        await AuthenticateAsync(factory, client, SystemRoles.Customer);

        using var response = await client.GetAsync("/api/notifications");

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    private static async Task<Guid> AuthenticateAsync(
        ApiWebApplicationFactory factory,
        HttpClient client,
        string role)
    {
        var email =
            $"notifications-{role.ToLowerInvariant()}-{Guid.NewGuid():N}@example.com";
        const string password = "Password123!";
        var userId = await factory.SeedUserAsync(
            email,
            password,
            role: role);

        using var response = await client.PostAsJsonAsync(
            "/api/auth/login",
            new { email, password });
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        using var json = await ReadJsonAsync(response);
        var token = json.RootElement
            .GetProperty("data")
            .GetProperty("token")
            .GetString();

        Assert.False(string.IsNullOrWhiteSpace(token));
        client.DefaultRequestHeaders.Authorization =
            new AuthenticationHeaderValue("Bearer", token);

        return userId;
    }

    private static async Task<JsonDocument> ReadJsonAsync(
        HttpResponseMessage response)
    {
        var content = await response.Content.ReadAsStringAsync();
        return JsonDocument.Parse(content);
    }
}
