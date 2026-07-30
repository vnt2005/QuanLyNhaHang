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

public sealed class RolePermissionSelectionResponseTests
{
    [Fact]
    public async Task SelectionEndpoint_ReturnsCompletePermissionDisplayFields()
    {
        using var factory = new ApiWebApplicationFactory();
        using var adminClient = factory.CreateHttpsClient();
        await AuthenticateAdminAsync(factory, adminClient);

        using (var syncResponse = await adminClient.PostAsync(
                   "/api/roles/sync-system",
                   content: null))
        {
            Assert.Equal(HttpStatusCode.OK, syncResponse.StatusCode);
        }

        Guid cashierRoleId;
        using (var scope = factory.Services.CreateScope())
        {
            var context = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
            cashierRoleId = await context.Roles
                .Where(role => role.Name == SystemRoles.Cashier)
                .Select(role => role.Id)
                .SingleAsync();
        }

        using var response = await adminClient.GetAsync(
            $"/api/role-permissions/roles/{cashierRoleId}/selection");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        using var json = await ReadJsonAsync(response);
        var root = json.RootElement;

        Assert.Equal(cashierRoleId, root.GetProperty("roleId").GetGuid());
        Assert.Equal(SystemRoles.Cashier, root.GetProperty("roleName").GetString());
        Assert.False(string.IsNullOrWhiteSpace(
            root.GetProperty("roleDisplayName").GetString()));

        var permissions = root.GetProperty("permissions").EnumerateArray().ToArray();
        Assert.Equal(PermissionCatalog.All.Count, permissions.Length);
        Assert.Contains(permissions, permission => permission.GetProperty("isSelected").GetBoolean());

        foreach (var permission in permissions)
        {
            Assert.NotEqual(Guid.Empty, permission.GetProperty("permissionId").GetGuid());
            Assert.False(string.IsNullOrWhiteSpace(
                permission.GetProperty("permissionCode").GetString()));
            Assert.False(string.IsNullOrWhiteSpace(
                permission.GetProperty("permissionName").GetString()));
            Assert.False(string.IsNullOrWhiteSpace(
                permission.GetProperty("permissionGroupName").GetString()));
        }
    }

    private static async Task AuthenticateAdminAsync(
        ApiWebApplicationFactory factory,
        HttpClient client)
    {
        var suffix = Guid.NewGuid().ToString("N");
        var email = $"permission-selection-{suffix}@example.com";
        var password = $"Test-{suffix[..12]}!Aa1";

        await factory.SeedUserAsync(email, password);

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
    }

    private static async Task<JsonDocument> ReadJsonAsync(
        HttpResponseMessage response)
    {
        var content = await response.Content.ReadAsStringAsync();
        return JsonDocument.Parse(content);
    }
}
