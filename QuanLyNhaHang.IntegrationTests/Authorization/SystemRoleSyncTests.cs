using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Reflection;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using QuanLyNhaHang.Api.Authorization;
using QuanLyNhaHang.Api.Controllers;
using QuanLyNhaHang.Application.Common.Constants;
using QuanLyNhaHang.Domain.Entities;
using QuanLyNhaHang.Infrastructure.Persistence;
using QuanLyNhaHang.IntegrationTests.Infrastructure;
using Xunit;

namespace QuanLyNhaHang.IntegrationTests.Authorization;

public sealed class SystemRoleSyncTests
{
    [Fact]
    public async Task AdminSync_CreatesSystemRolesWithDefaultsAndIsIdempotent()
    {
        using var factory = new ApiWebApplicationFactory();
        using var adminClient = factory.CreateHttpsClient();
        await AuthenticateAsync(factory, adminClient, SystemRoles.Admin);

        using var firstResponse = await adminClient.PostAsync(
            "/api/roles/sync-system",
            content: null);

        Assert.Equal(HttpStatusCode.OK, firstResponse.StatusCode);

        using (var json = await ReadJsonAsync(firstResponse))
        {
            var roles = json.RootElement
                .GetProperty("data")
                .GetProperty("roles");
            Assert.Equal(SystemRoleCatalog.All.Count, roles.GetProperty("catalogCount").GetInt32());
            Assert.Equal(SystemRoleCatalog.All.Count, roles.GetProperty("createdRoleCount").GetInt32());
            Assert.Equal(0, roles.GetProperty("existingRoleCount").GetInt32());
            Assert.Equal(
                SystemRoleCatalog.All.Sum(role => role.DefaultPermissionCodes.Count),
                roles.GetProperty("addedRolePermissionCount").GetInt32());
            Assert.Equal(0, roles.GetProperty("skippedPermissionCount").GetInt32());
        }

        using (var scope = factory.Services.CreateScope())
        {
            var context = scope.ServiceProvider
                .GetRequiredService<ApplicationDbContext>();

            foreach (var definition in SystemRoleCatalog.All)
            {
                var role = await context.Roles
                    .AsNoTracking()
                    .SingleAsync(x => x.Name == definition.Name);
                var permissionCodes = await (
                    from rolePermission in context.RolePermissions.AsNoTracking()
                    join permission in context.Permissions.AsNoTracking()
                        on rolePermission.PermissionId equals permission.Id
                    where rolePermission.RoleId == role.Id
                    select permission.Code)
                    .ToListAsync();

                Assert.Equal(
                    definition.DefaultPermissionCodes.OrderBy(x => x, StringComparer.Ordinal),
                    permissionCodes.OrderBy(x => x, StringComparer.Ordinal));
            }
        }

        using var secondResponse = await adminClient.PostAsync(
            "/api/roles/sync-system",
            content: null);

        Assert.Equal(HttpStatusCode.OK, secondResponse.StatusCode);

        using var secondJson = await ReadJsonAsync(secondResponse);
        var secondRoles = secondJson.RootElement
            .GetProperty("data")
            .GetProperty("roles");
        Assert.Equal(0, secondRoles.GetProperty("createdRoleCount").GetInt32());
        Assert.Equal(SystemRoleCatalog.All.Count, secondRoles.GetProperty("existingRoleCount").GetInt32());
        Assert.Equal(0, secondRoles.GetProperty("addedRolePermissionCount").GetInt32());
    }

    [Fact]
    public async Task AdminSync_PreservesExistingSystemAndCustomRoleConfiguration()
    {
        using var factory = new ApiWebApplicationFactory();
        using var adminClient = factory.CreateHttpsClient();
        await AuthenticateAsync(factory, adminClient, SystemRoles.Admin);

        var ordersView = new Permission(
            PermissionCodes.OrdersView,
            "Quyền xem order tùy chỉnh",
            "CustomOrders",
            "Không được sync ghi đè");
        var manager = new Role(
            SystemRoles.Manager,
            "Quản lý đã tùy chỉnh",
            "Mô tả tùy chỉnh");
        manager.Deactivate();
        var customRole = new Role(
            "Auditor",
            "Kiểm toán",
            "Vai trò tùy chỉnh phải được giữ nguyên");

        using (var scope = factory.Services.CreateScope())
        {
            var context = scope.ServiceProvider
                .GetRequiredService<ApplicationDbContext>();
            context.Permissions.Add(ordersView);
            context.Roles.AddRange(manager, customRole);
            context.RolePermissions.Add(
                new RolePermission(manager.Id, ordersView.Id));
            await context.SaveChangesAsync();
        }

        using var response = await adminClient.PostAsync(
            "/api/roles/sync-system",
            content: null);

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        using (var json = await ReadJsonAsync(response))
        {
            var roles = json.RootElement
                .GetProperty("data")
                .GetProperty("roles");
            Assert.Equal(SystemRoleCatalog.All.Count - 1, roles.GetProperty("createdRoleCount").GetInt32());
            Assert.Equal(1, roles.GetProperty("existingRoleCount").GetInt32());
            Assert.Equal(
                SystemRoleCatalog.All
                    .Where(role => role.Name != SystemRoles.Manager)
                    .Sum(role => role.DefaultPermissionCodes.Count),
                roles.GetProperty("addedRolePermissionCount").GetInt32());
        }

        using (var scope = factory.Services.CreateScope())
        {
            var context = scope.ServiceProvider
                .GetRequiredService<ApplicationDbContext>();
            var preservedManager = await context.Roles
                .AsNoTracking()
                .SingleAsync(role => role.Id == manager.Id);
            var preservedCustomRole = await context.Roles
                .AsNoTracking()
                .SingleAsync(role => role.Id == customRole.Id);
            var managerPermissionCodes = await (
                from rolePermission in context.RolePermissions.AsNoTracking()
                join permission in context.Permissions.AsNoTracking()
                    on rolePermission.PermissionId equals permission.Id
                where rolePermission.RoleId == manager.Id
                select permission.Code)
                .ToListAsync();

            Assert.Equal("Quản lý đã tùy chỉnh", preservedManager.DisplayName);
            Assert.Equal("Mô tả tùy chỉnh", preservedManager.Description);
            Assert.False(preservedManager.IsActive);
            Assert.Equal(new[] { PermissionCodes.OrdersView }, managerPermissionCodes);
            Assert.Equal("Auditor", preservedCustomRole.Name);
            Assert.True(preservedCustomRole.IsActive);
        }
    }

    [Fact]
    public async Task Manager_CannotSyncSystemRoles()
    {
        using var factory = new ApiWebApplicationFactory();
        using var managerClient = factory.CreateHttpsClient();
        await AuthenticateAsync(factory, managerClient, SystemRoles.Manager);

        using var response = await managerClient.PostAsync(
            "/api/roles/sync-system",
            content: null);

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    [Fact]
    public void SyncSystemRoles_RequiresRolesManage()
    {
        var method = typeof(RolesController).GetMethod(
            nameof(RolesController.SyncSystemRoles),
            BindingFlags.Instance | BindingFlags.Public | BindingFlags.DeclaredOnly);

        Assert.NotNull(method);

        var attribute = method!
            .GetCustomAttributes<HasPermissionAttribute>(inherit: true)
            .Single();

        Assert.Equal(
            $"{HasPermissionAttribute.PolicyPrefix}{PermissionCodes.RolesManage}",
            attribute.Policy);
    }

    private static async Task AuthenticateAsync(
        ApiWebApplicationFactory factory,
        HttpClient client,
        string role)
    {
        var suffix = Guid.NewGuid().ToString("N");
        var email = $"role-sync-{role.ToLowerInvariant()}-{suffix}@example.com";
        var password = $"Test-{suffix[..12]}!Aa1";

        await factory.SeedUserAsync(email, password, role: role);

        using var response = await client.PostAsJsonAsync(
            "/api/auth/login",
            new
            {
                email,
                password
            });

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
