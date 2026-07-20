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

public sealed class SystemRoleProtectionTests
{
    [Fact]
    public async Task ReservedSystemRoleNames_CannotBeCreatedManually()
    {
        using var factory = new ApiWebApplicationFactory();
        using var adminClient = factory.CreateHttpsClient();
        await AuthenticateAdminAsync(factory, adminClient);

        foreach (var roleName in new[]
                 {
                     "Admin",
                     " manager ",
                     "CASHIER",
                     "kitchen",
                     "Staff",
                     "customer"
                 })
        {
            using var response = await adminClient.PostAsJsonAsync(
                "/api/roles",
                new
                {
                    name = roleName,
                    displayName = $"Thử tạo {roleName}",
                    description = "Integration test"
                });

            Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        }

        using var scope = factory.Services.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        Assert.Empty(await context.Roles.AsNoTracking().ToListAsync());
    }

    [Fact]
    public async Task SystemRoles_CannotBeDeactivatedByUpdateOrDelete()
    {
        using var factory = new ApiWebApplicationFactory();
        using var adminClient = factory.CreateHttpsClient();
        await AuthenticateAdminAsync(factory, adminClient);
        await SyncSystemRolesAsync(adminClient);

        List<RoleSnapshot> roles;
        using (var scope = factory.Services.CreateScope())
        {
            var context = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
            roles = await context.Roles
                .AsNoTracking()
                .OrderBy(role => role.Name)
                .Select(role => new RoleSnapshot(
                    role.Id,
                    role.Name,
                    role.DisplayName,
                    role.Description))
                .ToListAsync();
        }

        Assert.Equal(SystemRoleCatalog.All.Count, roles.Count);

        foreach (var role in roles)
        {
            using var updateResponse = await adminClient.PutAsJsonAsync(
                $"/api/roles/{role.Id}",
                new
                {
                    id = role.Id,
                    displayName = $"Không được lưu {role.Name}",
                    description = "Không được thay đổi khi vô hiệu hóa",
                    isActive = false
                });
            Assert.Equal(HttpStatusCode.BadRequest, updateResponse.StatusCode);

            using var deleteResponse = await adminClient.DeleteAsync(
                $"/api/roles/{role.Id}");
            Assert.Equal(HttpStatusCode.BadRequest, deleteResponse.StatusCode);
        }

        using (var scope = factory.Services.CreateScope())
        {
            var context = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
            var persistedRoles = await context.Roles
                .AsNoTracking()
                .OrderBy(role => role.Name)
                .ToListAsync();

            Assert.All(persistedRoles, role => Assert.True(role.IsActive));
            foreach (var original in roles)
            {
                var persisted = persistedRoles.Single(role => role.Id == original.Id);
                Assert.Equal(original.DisplayName, persisted.DisplayName);
                Assert.Equal(original.Description, persisted.Description);
            }
        }
    }

    [Fact]
    public async Task SystemRole_MetadataCanBeEditedAndLegacyInactiveRoleCanBeReactivated()
    {
        using var factory = new ApiWebApplicationFactory();
        using var adminClient = factory.CreateHttpsClient();
        await AuthenticateAdminAsync(factory, adminClient);
        await SyncSystemRolesAsync(adminClient);

        Guid staffRoleId;
        using (var scope = factory.Services.CreateScope())
        {
            var context = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
            var staffRole = await context.Roles.SingleAsync(role => role.Name == SystemRoles.Staff);
            staffRole.Deactivate();
            staffRoleId = staffRole.Id;
            await context.SaveChangesAsync();
        }

        using var response = await adminClient.PutAsJsonAsync(
            $"/api/roles/{staffRoleId}",
            new
            {
                id = staffRoleId,
                displayName = "Nhân viên phục vụ đã khôi phục",
                description = "Metadata system role vẫn được phép cập nhật",
                isActive = true
            });

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        using var verifyScope = factory.Services.CreateScope();
        var verifyContext = verifyScope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        var persistedRole = await verifyContext.Roles
            .AsNoTracking()
            .SingleAsync(role => role.Id == staffRoleId);

        Assert.True(persistedRole.IsActive);
        Assert.Equal("Nhân viên phục vụ đã khôi phục", persistedRole.DisplayName);
        Assert.Equal("Metadata system role vẫn được phép cập nhật", persistedRole.Description);
        Assert.Equal(SystemRoles.Staff, persistedRole.Name);
    }

    [Fact]
    public async Task CustomRoles_CanStillBeDeactivatedByUpdateAndDelete()
    {
        using var factory = new ApiWebApplicationFactory();
        using var adminClient = factory.CreateHttpsClient();
        await AuthenticateAdminAsync(factory, adminClient);

        var updateRoleId = await CreateCustomRoleAsync(adminClient, "Supervisor");
        var deleteRoleId = await CreateCustomRoleAsync(adminClient, "Auditor");

        using var updateResponse = await adminClient.PutAsJsonAsync(
            $"/api/roles/{updateRoleId}",
            new
            {
                id = updateRoleId,
                displayName = "Giám sát đã tắt",
                description = "Role tùy chỉnh được phép vô hiệu hóa",
                isActive = false
            });
        Assert.Equal(HttpStatusCode.OK, updateResponse.StatusCode);

        using var deleteResponse = await adminClient.DeleteAsync(
            $"/api/roles/{deleteRoleId}");
        Assert.Equal(HttpStatusCode.OK, deleteResponse.StatusCode);

        using var scope = factory.Services.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        var roles = await context.Roles
            .AsNoTracking()
            .Where(role => role.Id == updateRoleId || role.Id == deleteRoleId)
            .ToListAsync();

        Assert.Equal(2, roles.Count);
        Assert.All(roles, role => Assert.False(role.IsActive));
    }

    private static async Task SyncSystemRolesAsync(HttpClient adminClient)
    {
        using var response = await adminClient.PostAsync(
            "/api/roles/sync-system",
            content: null);
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
    }

    private static async Task<Guid> CreateCustomRoleAsync(
        HttpClient adminClient,
        string name)
    {
        using var response = await adminClient.PostAsJsonAsync(
            "/api/roles",
            new
            {
                name,
                displayName = name,
                description = "Integration custom role"
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
        var email = $"role-protection-admin-{suffix}@example.com";
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

    private sealed record RoleSnapshot(
        Guid Id,
        string Name,
        string DisplayName,
        string? Description);
}
