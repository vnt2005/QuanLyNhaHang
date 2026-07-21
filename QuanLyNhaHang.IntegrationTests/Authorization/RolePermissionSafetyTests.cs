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

namespace QuanLyNhaHang.IntegrationTests.Authorization;

public sealed class RolePermissionSafetyTests
{
    [Fact]
    public async Task AdminAndCustomer_CannotReceivePermissions()
    {
        using var factory = new ApiWebApplicationFactory();
        using var adminClient = factory.CreateHttpsClient();
        await AuthenticateAdminAsync(factory, adminClient);
        await SyncSystemRolesAsync(adminClient);

        Guid permissionId;
        List<Guid> protectedRoleIds;
        using (var scope = factory.Services.CreateScope())
        {
            var context = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
            permissionId = await context.Permissions
                .Where(permission => permission.Code == PermissionCodes.OrdersView)
                .Select(permission => permission.Id)
                .SingleAsync();
            protectedRoleIds = await context.Roles
                .Where(role =>
                    role.Name == SystemRoles.Admin ||
                    role.Name == SystemRoles.Customer)
                .Select(role => role.Id)
                .ToListAsync();
        }

        Assert.Equal(2, protectedRoleIds.Count);

        foreach (var roleId in protectedRoleIds)
        {
            using var createResponse = await adminClient.PostAsJsonAsync(
                "/api/role-permissions",
                new { roleId, permissionId });
            Assert.Equal(HttpStatusCode.BadRequest, createResponse.StatusCode);

            using var updateResponse = await adminClient.PutAsJsonAsync(
                $"/api/role-permissions/roles/{roleId}",
                new
                {
                    roleId,
                    permissionIds = new[] { permissionId },
                    confirmRemoveAll = true
                });
            Assert.Equal(HttpStatusCode.BadRequest, updateResponse.StatusCode);
        }

        using var verifyScope = factory.Services.CreateScope();
        var verifyContext = verifyScope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        var mappingCount = await verifyContext.RolePermissions
            .CountAsync(mapping => protectedRoleIds.Contains(mapping.RoleId));
        Assert.Equal(0, mappingCount);
    }

    [Fact]
    public async Task ProtectedRoles_CanRemoveLegacyMappings()
    {
        using var factory = new ApiWebApplicationFactory();
        using var adminClient = factory.CreateHttpsClient();
        await AuthenticateAdminAsync(factory, adminClient);
        await SyncSystemRolesAsync(adminClient);

        Guid adminRoleId;
        Guid customerRoleId;
        Guid adminPermissionId;
        Guid customerPermissionId;

        using (var scope = factory.Services.CreateScope())
        {
            var context = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
            adminRoleId = await context.Roles
                .Where(role => role.Name == SystemRoles.Admin)
                .Select(role => role.Id)
                .SingleAsync();
            customerRoleId = await context.Roles
                .Where(role => role.Name == SystemRoles.Customer)
                .Select(role => role.Id)
                .SingleAsync();
            adminPermissionId = await context.Permissions
                .Where(permission => permission.Code == PermissionCodes.RolesView)
                .Select(permission => permission.Id)
                .SingleAsync();
            customerPermissionId = await context.Permissions
                .Where(permission => permission.Code == PermissionCodes.OrdersView)
                .Select(permission => permission.Id)
                .SingleAsync();

            context.RolePermissions.AddRange(
                new RolePermission(adminRoleId, adminPermissionId),
                new RolePermission(customerRoleId, customerPermissionId));
            await context.SaveChangesAsync();
        }

        using var deleteAdminResponse = await adminClient.DeleteAsync(
            $"/api/role-permissions/roles/{adminRoleId}/permissions/{adminPermissionId}");
        Assert.Equal(HttpStatusCode.OK, deleteAdminResponse.StatusCode);

        using var clearCustomerResponse = await adminClient.PutAsJsonAsync(
            $"/api/role-permissions/roles/{customerRoleId}",
            new
            {
                roleId = customerRoleId,
                permissionIds = Array.Empty<Guid>(),
                confirmRemoveAll = false
            });
        Assert.Equal(HttpStatusCode.OK, clearCustomerResponse.StatusCode);

        using var verifyScope = factory.Services.CreateScope();
        var verifyContext = verifyScope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        var remainingMappings = await verifyContext.RolePermissions
            .CountAsync(mapping =>
                mapping.RoleId == adminRoleId ||
                mapping.RoleId == customerRoleId);
        Assert.Equal(0, remainingMappings);
    }

    [Fact]
    public async Task BulkClear_RequiresExplicitConfirmation()
    {
        using var factory = new ApiWebApplicationFactory();
        using var adminClient = factory.CreateHttpsClient();
        await AuthenticateAdminAsync(factory, adminClient);
        await SyncSystemRolesAsync(adminClient);

        Guid managerRoleId;
        int initialPermissionCount;
        using (var scope = factory.Services.CreateScope())
        {
            var context = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
            managerRoleId = await context.Roles
                .Where(role => role.Name == SystemRoles.Manager)
                .Select(role => role.Id)
                .SingleAsync();
            initialPermissionCount = await context.RolePermissions
                .CountAsync(mapping => mapping.RoleId == managerRoleId);
        }

        Assert.True(initialPermissionCount > 0);

        using var rejectedResponse = await adminClient.PutAsJsonAsync(
            $"/api/role-permissions/roles/{managerRoleId}",
            new
            {
                roleId = managerRoleId,
                permissionIds = Array.Empty<Guid>(),
                confirmRemoveAll = false
            });
        Assert.Equal(HttpStatusCode.BadRequest, rejectedResponse.StatusCode);

        using (var verifyRejectedScope = factory.Services.CreateScope())
        {
            var context = verifyRejectedScope.ServiceProvider
                .GetRequiredService<ApplicationDbContext>();
            var persistedCount = await context.RolePermissions
                .CountAsync(mapping => mapping.RoleId == managerRoleId);
            Assert.Equal(initialPermissionCount, persistedCount);
        }

        using var confirmedResponse = await adminClient.PutAsJsonAsync(
            $"/api/role-permissions/roles/{managerRoleId}",
            new
            {
                roleId = managerRoleId,
                permissionIds = Array.Empty<Guid>(),
                confirmRemoveAll = true
            });
        Assert.Equal(HttpStatusCode.OK, confirmedResponse.StatusCode);

        using var verifyConfirmedScope = factory.Services.CreateScope();
        var verifyConfirmedContext = verifyConfirmedScope.ServiceProvider
            .GetRequiredService<ApplicationDbContext>();
        Assert.Equal(
            0,
            await verifyConfirmedContext.RolePermissions
                .CountAsync(mapping => mapping.RoleId == managerRoleId));
    }

    [Fact]
    public async Task SingleDelete_AllowsOneOfManyButBlocksTheLastPermission()
    {
        using var factory = new ApiWebApplicationFactory();
        using var adminClient = factory.CreateHttpsClient();
        await AuthenticateAdminAsync(factory, adminClient);
        await SyncSystemRolesAsync(adminClient);

        var roleId = await CreateCustomRoleAsync(adminClient);
        Guid[] permissionIds;
        using (var scope = factory.Services.CreateScope())
        {
            var context = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
            permissionIds = await context.Permissions
                .Where(permission =>
                    permission.Code == PermissionCodes.OrdersView ||
                    permission.Code == PermissionCodes.TablesView)
                .OrderBy(permission => permission.Code)
                .Select(permission => permission.Id)
                .ToArrayAsync();
        }

        Assert.Equal(2, permissionIds.Length);

        var firstMappingId = await AssignPermissionAsync(
            adminClient,
            roleId,
            permissionIds[0]);
        await AssignPermissionAsync(
            adminClient,
            roleId,
            permissionIds[1]);

        using var deleteOneResponse = await adminClient.DeleteAsync(
            $"/api/role-permissions/{firstMappingId}");
        Assert.Equal(HttpStatusCode.OK, deleteOneResponse.StatusCode);

        using var deleteLastResponse = await adminClient.DeleteAsync(
            $"/api/role-permissions/roles/{roleId}/permissions/{permissionIds[1]}");
        Assert.Equal(HttpStatusCode.BadRequest, deleteLastResponse.StatusCode);

        using (var verifyBlockedScope = factory.Services.CreateScope())
        {
            var context = verifyBlockedScope.ServiceProvider
                .GetRequiredService<ApplicationDbContext>();
            Assert.Equal(
                1,
                await context.RolePermissions
                    .CountAsync(mapping => mapping.RoleId == roleId));
        }

        using var clearResponse = await adminClient.PutAsJsonAsync(
            $"/api/role-permissions/roles/{roleId}",
            new
            {
                roleId,
                permissionIds = Array.Empty<Guid>(),
                confirmRemoveAll = true
            });
        Assert.Equal(HttpStatusCode.OK, clearResponse.StatusCode);
    }

    private static async Task SyncSystemRolesAsync(HttpClient adminClient)
    {
        using var response = await adminClient.PostAsync(
            "/api/roles/sync-system",
            content: null);
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
    }

    private static async Task<Guid> CreateCustomRoleAsync(HttpClient adminClient)
    {
        var suffix = Guid.NewGuid().ToString("N");
        using var response = await adminClient.PostAsJsonAsync(
            "/api/roles",
            new
            {
                name = $"Auditor-{suffix[..8]}",
                displayName = "Kiểm toán phân quyền",
                description = "Integration test role"
            });
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        using var json = await ReadJsonAsync(response);
        return json.RootElement
            .GetProperty("data")
            .GetProperty("id")
            .GetGuid();
    }

    private static async Task<Guid> AssignPermissionAsync(
        HttpClient adminClient,
        Guid roleId,
        Guid permissionId)
    {
        using var response = await adminClient.PostAsJsonAsync(
            "/api/role-permissions",
            new { roleId, permissionId });
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        using var json = await ReadJsonAsync(response);
        return json.RootElement
            .GetProperty("data")
            .GetProperty("id")
            .GetGuid();
    }

    private static async Task AuthenticateAdminAsync(
        ApiWebApplicationFactory factory,
        HttpClient client)
    {
        var suffix = Guid.NewGuid().ToString("N");
        var email = $"role-permission-safety-{suffix}@example.com";
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