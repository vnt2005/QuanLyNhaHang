using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using QuanLyNhaHang.Application.Common.Constants;
using QuanLyNhaHang.IntegrationTests.Infrastructure;
using Xunit;

namespace QuanLyNhaHang.IntegrationTests.Authorization;

public sealed class SchedulingAuthorizationTests
{
    [Theory]
    [InlineData(SystemRoles.Manager, true)]
    [InlineData(SystemRoles.Cashier, false)]
    [InlineData(SystemRoles.Kitchen, false)]
    [InlineData(SystemRoles.Staff, false)]
    public async Task EmployeeRole_ReceivesExpectedSchedulingAccess(
        string role,
        bool isAllowed)
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

        await AssertAccessAsync(employeeClient, "/api/shifts", isAllowed);
        await AssertAccessAsync(
            employeeClient,
            "/api/employeeshifts",
            isAllowed);
    }

    [Fact]
    public async Task Admin_CanAccessSchedulingResources()
    {
        using var factory = new ApiWebApplicationFactory();
        using var adminClient = factory.CreateHttpsClient();
        await AuthenticateAdminAsync(factory, adminClient);

        await AssertAccessAsync(adminClient, "/api/shifts", isAllowed: true);
        await AssertAccessAsync(
            adminClient,
            "/api/employeeshifts",
            isAllowed: true);
    }

    private static async Task AuthenticateAdminAsync(
        ApiWebApplicationFactory factory,
        HttpClient client)
    {
        var email = $"scheduling-admin-{Guid.NewGuid():N}@example.com";
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
        var email = $"schedule-{role.ToLowerInvariant()}-{suffix}@example.com";
        var phoneNumber =
            $"09{Random.Shared.Next(10_000_000, 99_999_999)}";

        using var response = await adminClient.PostAsJsonAsync(
            "/api/employees",
            new
            {
                employeeCode,
                ho = "Scheduling",
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
        return new EmployeeLogin(token!);
    }

    private static async Task AssertAccessAsync(
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

    private static async Task<JsonDocument> ReadJsonAsync(
        HttpResponseMessage response)
    {
        var content = await response.Content.ReadAsStringAsync();
        return JsonDocument.Parse(content);
    }

    private sealed record EmployeeAccount(string Email, string Password);

    private sealed record EmployeeLogin(string Token);
}
