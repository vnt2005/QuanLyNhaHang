using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Reflection;
using System.Text.Json;
using QuanLyNhaHang.Api.Authorization;
using QuanLyNhaHang.Api.Controllers;
using QuanLyNhaHang.Application.Common.Constants;
using QuanLyNhaHang.IntegrationTests.Infrastructure;
using Xunit;

namespace QuanLyNhaHang.IntegrationTests.Authorization;

public sealed class ActivityLogsAuthorizationTests
{
    [Fact]
    public async Task Admin_CanCreateAndDeleteActivityLog()
    {
        using var factory = new ApiWebApplicationFactory();
        using var client = factory.CreateHttpsClient();
        await AuthenticateAsync(factory, client, SystemRoles.Admin);

        using var createResponse = await client.PostAsJsonAsync(
            "/api/activity-logs",
            ValidPayload());
        Assert.Equal(HttpStatusCode.OK, createResponse.StatusCode);

        using var json = JsonDocument.Parse(
            await createResponse.Content.ReadAsStringAsync());
        var id = json.RootElement.GetProperty("data").GetProperty("id").GetGuid();

        using var deleteResponse = await client.DeleteAsync($"/api/activity-logs/{id}");
        Assert.Equal(HttpStatusCode.OK, deleteResponse.StatusCode);
    }

    [Theory]
    [InlineData(SystemRoles.Manager, HttpStatusCode.OK)]
    [InlineData(SystemRoles.Cashier, HttpStatusCode.Forbidden)]
    [InlineData(SystemRoles.Kitchen, HttpStatusCode.Forbidden)]
    [InlineData(SystemRoles.Staff, HttpStatusCode.Forbidden)]
    public async Task DefaultRoles_ReceiveLeastPrivilegeReadAccess(
        string role,
        HttpStatusCode expectedStatus)
    {
        using var factory = new ApiWebApplicationFactory();
        using var client = factory.CreateHttpsClient();
        await AuthenticateAsync(factory, client, role);

        foreach (var endpoint in new[]
                 {
                     "/api/activity-logs",
                     "/api/activity-logs/summary",
                     "/api/activity-logs/paginated"
                 })
        {
            using var response = await client.GetAsync(endpoint);
            Assert.Equal(expectedStatus, response.StatusCode);
        }
    }

    [Fact]
    public async Task Manager_CannotCreateOrDeleteActivityLogs()
    {
        using var factory = new ApiWebApplicationFactory();
        using var client = factory.CreateHttpsClient();
        await AuthenticateAsync(factory, client, SystemRoles.Manager);

        using var createResponse = await client.PostAsJsonAsync(
            "/api/activity-logs",
            ValidPayload());
        Assert.Equal(HttpStatusCode.Forbidden, createResponse.StatusCode);

        using var deleteResponse = await client.DeleteAsync(
            $"/api/activity-logs/{Guid.NewGuid()}");
        Assert.Equal(HttpStatusCode.Forbidden, deleteResponse.StatusCode);
    }

    [Fact]
    public void Actions_RequireExpectedPermissions()
    {
        AssertPermission(nameof(ActivityLogsController.GetList), PermissionCodes.ActivityLogsView);
        AssertPermission(nameof(ActivityLogsController.GetSummary), PermissionCodes.ActivityLogsView);
        AssertPermission(nameof(ActivityLogsController.GetWithPaginatedList), PermissionCodes.ActivityLogsView);
        AssertPermission(nameof(ActivityLogsController.GetById), PermissionCodes.ActivityLogsView);
        AssertPermission(nameof(ActivityLogsController.Create), PermissionCodes.ActivityLogsCreate);
        AssertPermission(nameof(ActivityLogsController.Delete), PermissionCodes.ActivityLogsDelete);
    }

    private static void AssertPermission(string actionName, string permissionCode)
    {
        var method = typeof(ActivityLogsController).GetMethod(
            actionName,
            BindingFlags.Instance | BindingFlags.Public | BindingFlags.DeclaredOnly);
        Assert.NotNull(method);

        var attribute = method!
            .GetCustomAttributes<HasPermissionAttribute>(inherit: true)
            .Single();
        Assert.Equal(
            $"{HasPermissionAttribute.PolicyPrefix}{permissionCode}",
            attribute.Policy);
    }

    private static object ValidPayload() => new
    {
        userName = "Integration User",
        action = "Review",
        moduleName = "IntegrationTests",
        description = "Permission boundary test.",
        status = "Success"
    };

    private static async Task AuthenticateAsync(
        ApiWebApplicationFactory factory,
        HttpClient client,
        string role)
    {
        var email = $"activity-{role.ToLowerInvariant()}-{Guid.NewGuid():N}@example.com";
        var password = $"Test-{Guid.NewGuid():N}!Aa1";
        await factory.SeedUserAsync(email, password, role: role);

        using var response = await client.PostAsJsonAsync(
            "/api/auth/login",
            new { email, password });
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        using var json = JsonDocument.Parse(
            await response.Content.ReadAsStringAsync());
        var token = json.RootElement.GetProperty("data").GetProperty("token").GetString();
        Assert.False(string.IsNullOrWhiteSpace(token));

        client.DefaultRequestHeaders.Authorization =
            new AuthenticationHeaderValue("Bearer", token);
    }
}
