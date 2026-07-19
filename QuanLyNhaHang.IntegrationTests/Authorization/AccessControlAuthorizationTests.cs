using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using Microsoft.Extensions.DependencyInjection;
using QuanLyNhaHang.Application.Common.Constants;
using QuanLyNhaHang.Domain.Entities;
using QuanLyNhaHang.Infrastructure.Persistence;
using QuanLyNhaHang.IntegrationTests.Infrastructure;
using Xunit;

namespace QuanLyNhaHang.IntegrationTests.Authorization;

public sealed class AccessControlAuthorizationTests
{
    private static readonly string[] AccessControlEndpoints =
    {
        "/api/roles",
        "/api/permissions",
        "/api/role-permissions"
    };

    [Fact]
    public async Task Admin_CanViewAccessControlResources()
    {
        using var factory = new ApiWebApplicationFactory();
        using var adminClient = factory.CreateHttpsClient();
        await AuthenticateAdminAsync(factory, adminClient);

        foreach (var endpoint in AccessControlEndpoints)
        {
            await AssertGetAccessAsync(adminClient, endpoint, isAllowed: true);
        }
    }

    [Theory]
    [InlineData(SystemRoles.Manager)]
    [InlineData(SystemRoles.Cashier)]
    [InlineData(SystemRoles.Kitchen)]
    [InlineData(SystemRoles.Staff)]
    public async Task DefaultEmployeeRoles_CannotViewOrManageAccessControl(
        string role)
    {
        using var factory = new ApiWebApplicationFactory();
        using var adminClient = factory.CreateHttpsClient();
        await AuthenticateAdminAsync(factory, adminClient);

        var employee = await CreateEmployeeAsync(adminClient, role);

        using var employeeClient = factory.CreateHttpsClient();
        var login = await LoginAsync(
            employeeClient,
            employee.Email,
            employee.Password);

        employeeClient.DefaultRequestHeaders.Authorization =
            new AuthenticationHeaderValue("Bearer", login.Token);

        foreach (var endpoint in AccessControlEndpoints)
        {
            await AssertGetAccessAsync(employeeClient, endpoint, isAllowed: false);
            await AssertPostForbiddenAsync(employeeClient, endpoint);
        }
    }

    [Fact]
    public async Task DatabaseConfiguredViewPermissions_AllowReadsButNotMutations()
    {
        using var factory = new ApiWebApplicationFactory();
        using var adminClient = factory.CreateHttpsClient();
        await AuthenticateAdminAsync(factory, adminClient);

        var expectedPermissions = new[]
        {
            PermissionCodes.RolesView,
            PermissionCodes.PermissionsView,
            PermissionCodes.RolePermissionsView
        };

        using (var scope = factory.Services.CreateScope())
        {
            var context = scope.ServiceProvider
                .GetRequiredService<ApplicationDbContext>();

            var role = new Role(
                SystemRoles.Cashier,
                "Thu ngân chỉ xem phân quyền",
                "Role cấu hình database cho integration test");

            var permissions = expectedPermissions
                .Select(code => new Permission(
                    code,
                    $"Integration test {code}",
                    "AccessControl",
                    null))
                .ToArray();

            context.Roles.Add(role);
            context.Permissions.AddRange(permissions);
            context.RolePermissions.AddRange(
                permissions.Select(permission =>
                    new RolePermission(role.Id, permission.Id)));

            await context.SaveChangesAsync();
        }

        var employee = await CreateEmployeeAsync(
            adminClient,
            SystemRoles.Cashier);

        using var employeeClient = factory.CreateHttpsClient();
        var login = await LoginAsync(
            employeeClient,
            employee.Email,
            employee.Password);

        Assert.Equal(
            expectedPermissions.OrderBy(x => x, StringComparer.Ordinal),
            login.Permissions.OrderBy(x => x, StringComparer.Ordinal));

        employeeClient.DefaultRequestHeaders.Authorization =
            new AuthenticationHeaderValue("Bearer", login.Token);

        foreach (var endpoint in AccessControlEndpoints)
        {
            await AssertGetAccessAsync(employeeClient, endpoint, isAllowed: true);
            await AssertPostForbiddenAsync(employeeClient, endpoint);
        }
    }

    private static async Task AuthenticateAdminAsync(
        ApiWebApplicationFactory factory,
        HttpClient client)
    {
        var email = $"access-control-admin-{Guid.NewGuid():N}@example.com";
        const string password = "Password123!";

        await factory.SeedUserAsync(email, password);
        var login = await LoginAsync(client, email, password);

        client.DefaultRequestHeaders.Authorization =
            new AuthenticationHeaderValue("Bearer", login.Token);
    }

    private static async Task<EmployeeAccount> CreateEmployeeAsync(
        HttpClient adminClient,
        string role)
    {
        var suffix = Guid.NewGuid().ToString("N");
        const string password = "Employee123!";
        var employeeCode = $"EMP-{suffix[..8]}";
        var email = $"access-control-{role.ToLowerInvariant()}-{suffix}@example.com";
        var phoneNumber =
            $"09{Random.Shared.Next(10_000_000, 99_999_999)}";

        using var response = await adminClient.PostAsJsonAsync(
            "/api/employees",
            new
            {
                employeeCode,
                ho = "AccessControl",
                ten = "Employee",
                email,
                phoneNumber,
                password,
                role,
                dateOfBirth = new DateTime(1995, 1, 1),
                address = "Integration test",
                position = role,
                baseSalary = 10_000_000m,
                hireDate = new DateTime(2026, 1, 1)
            });

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);

        return new EmployeeAccount(email, password);
    }

    private static async Task<EmployeeLogin> LoginAsync(
        HttpClient client,
        string email,
        string password)
    {
        using var response = await client.PostAsJsonAsync(
            "/api/auth/login",
            new
            {
                email,
                password
            });

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        using var json = await ReadJsonAsync(response);
        var data = json.RootElement.GetProperty("data");
        var token = data.GetProperty("token").GetString();

        Assert.False(string.IsNullOrWhiteSpace(token));

        var permissions = data
            .GetProperty("permissions")
            .EnumerateArray()
            .Select(x => x.GetString())
            .Where(x => !string.IsNullOrWhiteSpace(x))
            .Select(x => x!)
            .ToArray();

        return new EmployeeLogin(token!, permissions);
    }

    private static async Task AssertGetAccessAsync(
        HttpClient client,
        string endpoint,
        bool isAllowed)
    {
        using var response = await client.GetAsync(endpoint);

        Assert.Equal(
            isAllowed
                ? HttpStatusCode.OK
                : HttpStatusCode.Forbidden,
            response.StatusCode);
    }

    private static async Task AssertPostForbiddenAsync(
        HttpClient client,
        string endpoint)
    {
        using var response = await client.PostAsJsonAsync(endpoint, new { });

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    private static async Task<JsonDocument> ReadJsonAsync(
        HttpResponseMessage response)
    {
        var content = await response.Content.ReadAsStringAsync();
        return JsonDocument.Parse(content);
    }

    private sealed record EmployeeAccount(string Email, string Password);

    private sealed record EmployeeLogin(string Token, string[] Permissions);
}
