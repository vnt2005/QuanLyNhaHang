using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using QuanLyNhaHang.Application.Common.Constants;
using QuanLyNhaHang.Infrastructure.Persistence;
using QuanLyNhaHang.IntegrationTests.Infrastructure;
using Xunit;

namespace QuanLyNhaHang.IntegrationTests.Authorization;

public sealed class LivePermissionAuthorizationTests
{
    [Fact]
    public async Task ExistingToken_UsesUpdatedRolePermissionsWithoutRelogin()
    {
        using var factory = new ApiWebApplicationFactory();
        using var adminClient = factory.CreateHttpsClient();
        await AuthenticateAdminAsync(factory, adminClient);
        await SyncSystemRolesAsync(adminClient);

        Guid staffRoleId;
        Guid ordersViewId;
        Guid reservationsViewId;

        using (var scope = factory.Services.CreateScope())
        {
            var context = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();

            staffRoleId = await context.Roles
                .Where(role => role.Name == SystemRoles.Staff)
                .Select(role => role.Id)
                .SingleAsync();
            ordersViewId = await context.Permissions
                .Where(permission => permission.Code == PermissionCodes.OrdersView)
                .Select(permission => permission.Id)
                .SingleAsync();
            reservationsViewId = await context.Permissions
                .Where(permission => permission.Code == PermissionCodes.ReservationsView)
                .Select(permission => permission.Id)
                .SingleAsync();
        }

        await SetRolePermissionsAsync(
            adminClient,
            staffRoleId,
            new[] { ordersViewId });

        var suffix = Guid.NewGuid().ToString("N");
        var staffEmail = $"live-permission-staff-{suffix}@example.com";
        var staffPassword = $"Test-{suffix[..12]}!Aa1";
        await factory.SeedUserAsync(
            staffEmail,
            staffPassword,
            role: SystemRoles.Staff);

        using var staffClient = factory.CreateHttpsClient();
        var initialLogin = await LoginAsync(
            staffClient,
            staffEmail,
            staffPassword);
        staffClient.DefaultRequestHeaders.Authorization =
            new AuthenticationHeaderValue("Bearer", initialLogin.Token);

        Assert.Contains(PermissionCodes.OrdersView, initialLogin.Permissions);
        Assert.DoesNotContain(PermissionCodes.ReservationsView, initialLogin.Permissions);

        using (var ordersBefore = await staffClient.GetAsync("/api/orders"))
            Assert.Equal(HttpStatusCode.OK, ordersBefore.StatusCode);

        using (var reservationsBefore = await staffClient.GetAsync("/api/reservations"))
            Assert.Equal(HttpStatusCode.Forbidden, reservationsBefore.StatusCode);

        await SetRolePermissionsAsync(
            adminClient,
            staffRoleId,
            new[] { reservationsViewId });

        using (var ordersAfter = await staffClient.GetAsync("/api/orders"))
            Assert.Equal(HttpStatusCode.Forbidden, ordersAfter.StatusCode);

        using (var reservationsAfter = await staffClient.GetAsync("/api/reservations"))
            Assert.Equal(HttpStatusCode.OK, reservationsAfter.StatusCode);

        using var sessionResponse = await staffClient.GetAsync("/api/auth/me");
        Assert.Equal(HttpStatusCode.OK, sessionResponse.StatusCode);

        using var sessionJson = await ReadJsonAsync(sessionResponse);
        var session = sessionJson.RootElement.GetProperty("data");
        var permissions = session
            .GetProperty("permissions")
            .EnumerateArray()
            .Select(item => item.GetString())
            .Where(item => !string.IsNullOrWhiteSpace(item))
            .Select(item => item!)
            .ToArray();

        Assert.Equal(SystemRoles.Staff, session.GetProperty("role").GetString());
        Assert.Equal(new[] { PermissionCodes.ReservationsView }, permissions);
    }

    [Fact]
    public async Task ExistingToken_UsesCurrentDatabaseRoleAndAccountStatus()
    {
        using var factory = new ApiWebApplicationFactory();
        using var adminClient = factory.CreateHttpsClient();

        var suffix = Guid.NewGuid().ToString("N");
        var email = $"live-role-admin-{suffix}@example.com";
        var password = $"Test-{suffix[..12]}!Aa1";
        var userId = await factory.SeedUserAsync(email, password);
        var login = await LoginAsync(adminClient, email, password);
        adminClient.DefaultRequestHeaders.Authorization =
            new AuthenticationHeaderValue("Bearer", login.Token);

        await SyncSystemRolesAsync(adminClient);

        using (var beforeRoleChange = await adminClient.GetAsync("/api/roles"))
            Assert.Equal(HttpStatusCode.OK, beforeRoleChange.StatusCode);

        using (var scope = factory.Services.CreateScope())
        {
            var context = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
            var user = await context.Users.SingleAsync(item => item.Id == userId);

            user.UpdateInfo(
                user.Ho,
                user.Ten,
                user.Email,
                user.PhoneNumber,
                SystemRoles.Staff);
            await context.SaveChangesAsync();
        }

        using (var afterRoleChange = await adminClient.GetAsync("/api/roles"))
            Assert.Equal(HttpStatusCode.Forbidden, afterRoleChange.StatusCode);

        using (var sessionResponse = await adminClient.GetAsync("/api/auth/me"))
        {
            Assert.Equal(HttpStatusCode.OK, sessionResponse.StatusCode);
            using var sessionJson = await ReadJsonAsync(sessionResponse);
            Assert.Equal(
                SystemRoles.Staff,
                sessionJson.RootElement
                    .GetProperty("data")
                    .GetProperty("role")
                    .GetString());
        }

        using (var scope = factory.Services.CreateScope())
        {
            var context = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
            var user = await context.Users.SingleAsync(item => item.Id == userId);
            user.Deactivate();
            await context.SaveChangesAsync();
        }

        using (var protectedResponse = await adminClient.GetAsync("/api/orders"))
            Assert.Equal(HttpStatusCode.Forbidden, protectedResponse.StatusCode);

        using var inactiveSessionResponse = await adminClient.GetAsync("/api/auth/me");
        Assert.Equal(HttpStatusCode.Unauthorized, inactiveSessionResponse.StatusCode);
    }

    private static async Task SetRolePermissionsAsync(
        HttpClient adminClient,
        Guid roleId,
        IReadOnlyCollection<Guid> permissionIds)
    {
        using var response = await adminClient.PutAsJsonAsync(
            $"/api/role-permissions/roles/{roleId}",
            new
            {
                roleId,
                permissionIds,
                confirmRemoveAll = false
            });

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
    }

    private static async Task SyncSystemRolesAsync(HttpClient adminClient)
    {
        using var response = await adminClient.PostAsync(
            "/api/roles/sync-system",
            content: null);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
    }

    private static async Task AuthenticateAdminAsync(
        ApiWebApplicationFactory factory,
        HttpClient client)
    {
        var suffix = Guid.NewGuid().ToString("N");
        var email = $"live-permission-admin-{suffix}@example.com";
        var password = $"Test-{suffix[..12]}!Aa1";

        await factory.SeedUserAsync(email, password);
        var login = await LoginAsync(client, email, password);
        client.DefaultRequestHeaders.Authorization =
            new AuthenticationHeaderValue("Bearer", login.Token);
    }

    private static async Task<LoginSnapshot> LoginAsync(
        HttpClient client,
        string email,
        string password)
    {
        using var response = await client.PostAsJsonAsync(
            "/api/auth/login",
            new { email, password });

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        using var json = await ReadJsonAsync(response);
        var data = json.RootElement.GetProperty("data");
        var token = data.GetProperty("token").GetString();
        var permissions = data
            .GetProperty("permissions")
            .EnumerateArray()
            .Select(item => item.GetString())
            .Where(item => !string.IsNullOrWhiteSpace(item))
            .Select(item => item!)
            .ToArray();

        Assert.False(string.IsNullOrWhiteSpace(token));

        return new LoginSnapshot(token!, permissions);
    }

    private static async Task<JsonDocument> ReadJsonAsync(
        HttpResponseMessage response)
    {
        var content = await response.Content.ReadAsStringAsync();
        return JsonDocument.Parse(content);
    }

    private sealed record LoginSnapshot(
        string Token,
        string[] Permissions);
}
