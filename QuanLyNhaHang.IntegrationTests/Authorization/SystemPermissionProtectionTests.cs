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

public sealed class SystemPermissionProtectionTests
{
    private static readonly string[] ProtectedCodes =
    {
        PermissionCodes.PermissionsManage,
        PermissionCodes.RolesManage,
        PermissionCodes.OrdersView,
        PermissionCodes.KitchenView,
        PermissionCodes.TableOperationsTransfer
    };

    [Fact]
    public async Task ReservedSystemPermissionCodes_CannotBeCreatedManually()
    {
        using var factory = new ApiWebApplicationFactory();
        using var adminClient = factory.CreateHttpsClient();
        await AuthenticateAdminAsync(factory, adminClient);

        foreach (var code in new[]
                 {
                     PermissionCodes.OrdersView,
                     $"  {PermissionCodes.PermissionsManage}  ",
                     PermissionCodes.TableOperationsTransfer.ToUpperInvariant(),
                     PermissionCodes.KitchenView.ToLowerInvariant()
                 })
        {
            using var response = await adminClient.PostAsJsonAsync(
                "/api/permissions",
                new
                {
                    code,
                    name = $"Thử tạo {code}",
                    groupName = "Integration",
                    description = "Không được tạo thủ công"
                });

            Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        }

        using var scope = factory.Services.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        Assert.Empty(await context.Permissions.AsNoTracking().ToListAsync());
    }

    [Fact]
    public async Task SystemPermissions_CannotBeDeactivatedByUpdateOrDelete()
    {
        using var factory = new ApiWebApplicationFactory();
        using var adminClient = factory.CreateHttpsClient();
        await AuthenticateAdminAsync(factory, adminClient);
        await SyncPermissionCatalogAsync(adminClient);

        List<PermissionSnapshot> permissions;
        using (var scope = factory.Services.CreateScope())
        {
            var context = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
            permissions = await context.Permissions
                .AsNoTracking()
                .Where(permission => ProtectedCodes.Contains(permission.Code))
                .OrderBy(permission => permission.Code)
                .Select(permission => new PermissionSnapshot(
                    permission.Id,
                    permission.Code,
                    permission.Name,
                    permission.GroupName,
                    permission.Description))
                .ToListAsync();
        }

        Assert.Equal(ProtectedCodes.Length, permissions.Count);

        foreach (var permission in permissions)
        {
            using var updateResponse = await adminClient.PutAsJsonAsync(
                $"/api/permissions/{permission.Id}",
                new
                {
                    id = permission.Id,
                    name = $"Không được lưu {permission.Code}",
                    groupName = "Blocked",
                    description = "Không được thay đổi khi vô hiệu hóa",
                    isActive = false
                });
            Assert.Equal(HttpStatusCode.BadRequest, updateResponse.StatusCode);

            using var deleteResponse = await adminClient.DeleteAsync(
                $"/api/permissions/{permission.Id}");
            Assert.Equal(HttpStatusCode.BadRequest, deleteResponse.StatusCode);
        }

        using (var scope = factory.Services.CreateScope())
        {
            var context = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
            var persistedPermissions = await context.Permissions
                .AsNoTracking()
                .Where(permission => ProtectedCodes.Contains(permission.Code))
                .ToListAsync();

            Assert.All(persistedPermissions, permission => Assert.True(permission.IsActive));

            foreach (var original in permissions)
            {
                var persisted = persistedPermissions.Single(permission =>
                    permission.Id == original.Id);
                Assert.Equal(original.Code, persisted.Code);
                Assert.Equal(original.Name, persisted.Name);
                Assert.Equal(original.GroupName, persisted.GroupName);
                Assert.Equal(original.Description, persisted.Description);
            }
        }
    }

    [Fact]
    public async Task SystemPermission_MetadataCanBeEditedAndLegacyInactivePermissionCanBeReactivated()
    {
        using var factory = new ApiWebApplicationFactory();
        using var adminClient = factory.CreateHttpsClient();
        await AuthenticateAdminAsync(factory, adminClient);
        await SyncPermissionCatalogAsync(adminClient);

        Guid permissionId;
        using (var scope = factory.Services.CreateScope())
        {
            var context = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
            var permission = await context.Permissions.SingleAsync(item =>
                item.Code == PermissionCodes.ActivityLogsView);
            permission.Deactivate();
            permissionId = permission.Id;
            await context.SaveChangesAsync();
        }

        using var response = await adminClient.PutAsJsonAsync(
            $"/api/permissions/{permissionId}",
            new
            {
                id = permissionId,
                name = "Xem nhật ký đã khôi phục",
                groupName = "ActivityLogs",
                description = "Metadata quyền hệ thống vẫn được phép cập nhật",
                isActive = true
            });

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        using var verifyScope = factory.Services.CreateScope();
        var verifyContext = verifyScope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        var persistedPermission = await verifyContext.Permissions
            .AsNoTracking()
            .SingleAsync(permission => permission.Id == permissionId);

        Assert.True(persistedPermission.IsActive);
        Assert.Equal(PermissionCodes.ActivityLogsView, persistedPermission.Code);
        Assert.Equal("Xem nhật ký đã khôi phục", persistedPermission.Name);
        Assert.Equal("ActivityLogs", persistedPermission.GroupName);
        Assert.Equal(
            "Metadata quyền hệ thống vẫn được phép cập nhật",
            persistedPermission.Description);
    }

    [Fact]
    public async Task CustomPermissions_CanStillBeDeactivatedByUpdateAndDelete()
    {
        using var factory = new ApiWebApplicationFactory();
        using var adminClient = factory.CreateHttpsClient();
        await AuthenticateAdminAsync(factory, adminClient);

        var updatePermissionId = await CreateCustomPermissionAsync(
            adminClient,
            "Custom.Export");
        var deletePermissionId = await CreateCustomPermissionAsync(
            adminClient,
            "Custom.Audit");

        using var updateResponse = await adminClient.PutAsJsonAsync(
            $"/api/permissions/{updatePermissionId}",
            new
            {
                id = updatePermissionId,
                name = "Xuất dữ liệu đã tắt",
                groupName = "Custom",
                description = "Permission tùy chỉnh được phép vô hiệu hóa",
                isActive = false
            });
        Assert.Equal(HttpStatusCode.OK, updateResponse.StatusCode);

        using var deleteResponse = await adminClient.DeleteAsync(
            $"/api/permissions/{deletePermissionId}");
        Assert.Equal(HttpStatusCode.OK, deleteResponse.StatusCode);

        using var scope = factory.Services.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        var permissions = await context.Permissions
            .AsNoTracking()
            .Where(permission =>
                permission.Id == updatePermissionId ||
                permission.Id == deletePermissionId)
            .ToListAsync();

        Assert.Equal(2, permissions.Count);
        Assert.All(permissions, permission => Assert.False(permission.IsActive));
    }

    private static async Task SyncPermissionCatalogAsync(HttpClient adminClient)
    {
        using var response = await adminClient.PostAsync(
            "/api/permissions/sync-catalog",
            content: null);
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
    }

    private static async Task<Guid> CreateCustomPermissionAsync(
        HttpClient adminClient,
        string code)
    {
        using var response = await adminClient.PostAsJsonAsync(
            "/api/permissions",
            new
            {
                code,
                name = code,
                groupName = "Custom",
                description = "Integration custom permission"
            });
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
        var email = $"permission-protection-admin-{suffix}@example.com";
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

    private static async Task<JsonDocument> ReadJsonAsync(HttpResponseMessage response)
    {
        var content = await response.Content.ReadAsStringAsync();
        return JsonDocument.Parse(content);
    }

    private sealed record PermissionSnapshot(
        Guid Id,
        string Code,
        string Name,
        string GroupName,
        string? Description);
}
