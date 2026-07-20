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

public sealed class PermissionCatalogSyncTests
{
    [Fact]
    public async Task AdminSync_AddsMissingPermissionsWithoutOverwritingExistingData()
    {
        using var factory = new ApiWebApplicationFactory();
        using var adminClient = factory.CreateHttpsClient();
        await AuthenticateAsync(factory, adminClient, SystemRoles.Admin);

        var existingPermission = new Permission(
            PermissionCodes.OrdersView,
            "Tên quyền đã tùy chỉnh",
            "CustomOrders",
            "Mô tả do người dùng quản lý");
        existingPermission.Deactivate();
        var customPermission = new Permission(
            "Custom.Export",
            "Xuất dữ liệu tùy chỉnh",
            "Custom",
            "Quyền không thuộc catalog hệ thống");

        using (var scope = factory.Services.CreateScope())
        {
            var context = scope.ServiceProvider
                .GetRequiredService<ApplicationDbContext>();
            context.Permissions.AddRange(existingPermission, customPermission);
            await context.SaveChangesAsync();
        }

        using var firstResponse = await adminClient.PostAsync(
            "/api/permissions/sync-catalog",
            content: null);

        Assert.Equal(HttpStatusCode.OK, firstResponse.StatusCode);

        using (var json = await ReadJsonAsync(firstResponse))
        {
            var data = json.RootElement.GetProperty("data");
            Assert.Equal(PermissionCatalog.All.Count, data.GetProperty("catalogCount").GetInt32());
            Assert.Equal(1, data.GetProperty("existingCount").GetInt32());
            Assert.Equal(PermissionCatalog.All.Count - 1, data.GetProperty("addedCount").GetInt32());
        }

        using (var scope = factory.Services.CreateScope())
        {
            var context = scope.ServiceProvider
                .GetRequiredService<ApplicationDbContext>();
            var catalogCodes = PermissionCatalog.All
                .Select(definition => definition.Code)
                .ToArray();
            var synchronizedCount = await context.Permissions
                .AsNoTracking()
                .CountAsync(permission => catalogCodes.Contains(permission.Code));
            var preservedSystemPermission = await context.Permissions
                .AsNoTracking()
                .SingleAsync(permission => permission.Id == existingPermission.Id);
            var preservedCustomPermission = await context.Permissions
                .AsNoTracking()
                .SingleAsync(permission => permission.Id == customPermission.Id);

            Assert.Equal(PermissionCatalog.All.Count, synchronizedCount);
            Assert.Equal("Tên quyền đã tùy chỉnh", preservedSystemPermission.Name);
            Assert.Equal("CustomOrders", preservedSystemPermission.GroupName);
            Assert.False(preservedSystemPermission.IsActive);
            Assert.Equal("Custom.Export", preservedCustomPermission.Code);
            Assert.True(preservedCustomPermission.IsActive);
        }

        using var secondResponse = await adminClient.PostAsync(
            "/api/permissions/sync-catalog",
            content: null);

        Assert.Equal(HttpStatusCode.OK, secondResponse.StatusCode);

        using var secondJson = await ReadJsonAsync(secondResponse);
        var secondData = secondJson.RootElement.GetProperty("data");
        Assert.Equal(PermissionCatalog.All.Count, secondData.GetProperty("existingCount").GetInt32());
        Assert.Equal(0, secondData.GetProperty("addedCount").GetInt32());
    }

    [Fact]
    public async Task Manager_CannotSyncPermissionCatalog()
    {
        using var factory = new ApiWebApplicationFactory();
        using var managerClient = factory.CreateHttpsClient();
        await AuthenticateAsync(factory, managerClient, SystemRoles.Manager);

        using var response = await managerClient.PostAsync(
            "/api/permissions/sync-catalog",
            content: null);

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    [Fact]
    public void SyncCatalog_RequiresPermissionsManage()
    {
        var method = typeof(PermissionsController).GetMethod(
            nameof(PermissionsController.SyncCatalog),
            BindingFlags.Instance | BindingFlags.Public | BindingFlags.DeclaredOnly);

        Assert.NotNull(method);

        var attribute = method!
            .GetCustomAttributes<HasPermissionAttribute>(inherit: true)
            .Single();

        Assert.Equal(
            $"{HasPermissionAttribute.PolicyPrefix}{PermissionCodes.PermissionsManage}",
            attribute.Policy);
    }

    private static async Task AuthenticateAsync(
        ApiWebApplicationFactory factory,
        HttpClient client,
        string role)
    {
        var suffix = Guid.NewGuid().ToString("N");
        var email = $"catalog-{role.ToLowerInvariant()}-{suffix}@example.com";
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
