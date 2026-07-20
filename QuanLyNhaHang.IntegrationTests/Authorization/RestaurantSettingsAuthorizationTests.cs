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

public sealed class RestaurantSettingsAuthorizationTests
{
    [Fact]
    public async Task Admin_CanViewRestaurantSettings()
    {
        using var factory = new ApiWebApplicationFactory();
        using var adminClient = factory.CreateHttpsClient();
        await AuthenticateAdminAsync(factory, adminClient);

        using var response = await adminClient.GetAsync("/api/restaurant-settings");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
    }

    [Theory]
    [InlineData(SystemRoles.Manager, true)]
    [InlineData(SystemRoles.Cashier, true)]
    [InlineData(SystemRoles.Kitchen, false)]
    [InlineData(SystemRoles.Staff, false)]
    public async Task DefaultEmployeeRoles_ReceiveLeastPrivilegeReadAccess(
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

        using var response = await employeeClient.GetAsync(
            "/api/restaurant-settings");

        Assert.Equal(
            isAllowed
                ? HttpStatusCode.OK
                : HttpStatusCode.Forbidden,
            response.StatusCode);
    }

    [Fact]
    public async Task Manager_CanCreateRestaurantSettings()
    {
        using var factory = new ApiWebApplicationFactory();
        using var adminClient = factory.CreateHttpsClient();
        await AuthenticateAdminAsync(factory, adminClient);

        var manager = await CreateEmployeeAsync(
            adminClient,
            SystemRoles.Manager);

        using var managerClient = factory.CreateHttpsClient();
        var login = await LoginAsync(
            managerClient,
            manager.Email,
            manager.Password);
        managerClient.DefaultRequestHeaders.Authorization =
            new AuthenticationHeaderValue("Bearer", login.Token);

        using var response = await managerClient.PostAsJsonAsync(
            "/api/restaurant-settings",
            CreateValidSettingPayload());

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
    }

    [Fact]
    public async Task Cashier_CanViewButCannotManageRestaurantSettings()
    {
        using var factory = new ApiWebApplicationFactory();
        using var adminClient = factory.CreateHttpsClient();
        await AuthenticateAdminAsync(factory, adminClient);

        var cashier = await CreateEmployeeAsync(
            adminClient,
            SystemRoles.Cashier);

        using var cashierClient = factory.CreateHttpsClient();
        var login = await LoginAsync(
            cashierClient,
            cashier.Email,
            cashier.Password);
        cashierClient.DefaultRequestHeaders.Authorization =
            new AuthenticationHeaderValue("Bearer", login.Token);

        using var getResponse = await cashierClient.GetAsync(
            "/api/restaurant-settings");
        Assert.Equal(HttpStatusCode.OK, getResponse.StatusCode);

        using var createResponse = await cashierClient.PostAsJsonAsync(
            "/api/restaurant-settings",
            CreateValidSettingPayload());
        Assert.Equal(HttpStatusCode.Forbidden, createResponse.StatusCode);

        var settingId = Guid.NewGuid();
        using var updateResponse = await cashierClient.PutAsJsonAsync(
            $"/api/restaurant-settings/{settingId}",
            CreateValidSettingPayload());
        Assert.Equal(HttpStatusCode.Forbidden, updateResponse.StatusCode);

        using var deleteResponse = await cashierClient.DeleteAsync(
            $"/api/restaurant-settings/{settingId}");
        Assert.Equal(HttpStatusCode.Forbidden, deleteResponse.StatusCode);
    }

    [Fact]
    public void RestaurantSettingActions_RequireExpectedPermissions()
    {
        AssertPermission(
            nameof(RestaurantSettingsController.GetList),
            PermissionCodes.RestaurantSettingsView);
        AssertPermission(
            nameof(RestaurantSettingsController.GetWithPaginatedList),
            PermissionCodes.RestaurantSettingsView);
        AssertPermission(
            nameof(RestaurantSettingsController.GetById),
            PermissionCodes.RestaurantSettingsView);
        AssertPermission(
            nameof(RestaurantSettingsController.Create),
            PermissionCodes.RestaurantSettingsManage);
        AssertPermission(
            nameof(RestaurantSettingsController.Update),
            PermissionCodes.RestaurantSettingsManage);
        AssertPermission(
            nameof(RestaurantSettingsController.Delete),
            PermissionCodes.RestaurantSettingsManage);
    }

    private static void AssertPermission(
        string actionName,
        string permissionCode)
    {
        var method = typeof(RestaurantSettingsController).GetMethod(
            actionName,
            BindingFlags.Instance |
            BindingFlags.Public |
            BindingFlags.DeclaredOnly);

        Assert.NotNull(method);

        var attribute = method!
            .GetCustomAttributes<HasPermissionAttribute>(inherit: true)
            .Single();

        Assert.Equal(
            $"{HasPermissionAttribute.PolicyPrefix}{permissionCode}",
            attribute.Policy);
    }

    private static object CreateValidSettingPayload()
    {
        return new
        {
            restaurantName = "Integration Restaurant",
            address = "Integration test address",
            phoneNumber = "0900000000",
            email = "restaurant@example.com",
            taxCode = "TAX-001",
            websiteUrl = "https://example.com",
            logoUrl = "https://example.com/logo.png",
            defaultVatPercent = 10m,
            serviceChargePercent = 5m,
            currency = "VND",
            openingTime = "08:00",
            closingTime = "22:00",
            invoiceFooter = "Thank you",
            qrOrderWelcomeMessage = "Welcome"
        };
    }

    private static async Task AuthenticateAdminAsync(
        ApiWebApplicationFactory factory,
        HttpClient client)
    {
        var email = $"settings-admin-{Guid.NewGuid():N}@example.com";
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
        var email = $"settings-{role.ToLowerInvariant()}-{suffix}@example.com";

        using var response = await adminClient.PostAsJsonAsync(
            "/api/employees",
            new
            {
                employeeCode = $"EMP-{suffix[..8]}",
                ho = "Settings",
                ten = "Employee",
                email,
                phoneNumber = $"09{Random.Shared.Next(10_000_000, 99_999_999)}",
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
        var token = json.RootElement
            .GetProperty("data")
            .GetProperty("token")
            .GetString();

        Assert.False(string.IsNullOrWhiteSpace(token));

        return new EmployeeLogin(token!);
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
