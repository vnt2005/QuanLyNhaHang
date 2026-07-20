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

public sealed class PromotionAuthorizationTests
{
    private static readonly string[] PromotionReadEndpoints =
    {
        "/api/promotions",
        "/api/promotion-usages"
    };

    [Fact]
    public async Task Admin_CanViewPromotionResources()
    {
        using var factory = new ApiWebApplicationFactory();
        using var adminClient = factory.CreateHttpsClient();
        await AuthenticateAdminAsync(factory, adminClient);

        foreach (var endpoint in PromotionReadEndpoints)
        {
            await AssertGetAccessAsync(adminClient, endpoint, isAllowed: true);
        }
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

        foreach (var endpoint in PromotionReadEndpoints)
        {
            await AssertGetAccessAsync(employeeClient, endpoint, isAllowed);
        }
    }

    [Fact]
    public async Task Cashier_CannotManagePromotionCatalog()
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

        using var response = await cashierClient.PostAsJsonAsync(
            "/api/promotions",
            new { });

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    [Theory]
    [InlineData(SystemRoles.Kitchen)]
    [InlineData(SystemRoles.Staff)]
    public async Task RolesWithoutApplyPermission_CannotApplyPromotion(string role)
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

        using var response = await employeeClient.PostAsJsonAsync(
            "/api/promotions/apply",
            new { });

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
    }

    [Fact]
    public void PromotionActions_RequireExpectedPermissions()
    {
        AssertPermission<PromotionsController>(
            nameof(PromotionsController.GetList),
            PermissionCodes.PromotionsView);
        AssertPermission<PromotionsController>(
            nameof(PromotionsController.GetWithPaginatedList),
            PermissionCodes.PromotionsView);
        AssertPermission<PromotionsController>(
            nameof(PromotionsController.GetById),
            PermissionCodes.PromotionsView);
        AssertPermission<PromotionsController>(
            nameof(PromotionsController.Create),
            PermissionCodes.PromotionsManage);
        AssertPermission<PromotionsController>(
            nameof(PromotionsController.ApplyPromotion),
            PermissionCodes.PromotionsApply);
        AssertPermission<PromotionsController>(
            nameof(PromotionsController.Update),
            PermissionCodes.PromotionsManage);
        AssertPermission<PromotionsController>(
            nameof(PromotionsController.Delete),
            PermissionCodes.PromotionsManage);

        AssertPermission<PromotionUsagesController>(
            nameof(PromotionUsagesController.GetList),
            PermissionCodes.PromotionUsagesView);
        AssertPermission<PromotionUsagesController>(
            nameof(PromotionUsagesController.GetWithPaginatedList),
            PermissionCodes.PromotionUsagesView);
        AssertPermission<PromotionUsagesController>(
            nameof(PromotionUsagesController.GetById),
            PermissionCodes.PromotionUsagesView);
        AssertPermission<PromotionUsagesController>(
            nameof(PromotionUsagesController.UpdatePayment),
            PermissionCodes.PromotionUsagesUpdatePayment);
        AssertPermission<PromotionUsagesController>(
            nameof(PromotionUsagesController.Cancel),
            PermissionCodes.PromotionUsagesCancel);
    }

    private static void AssertPermission<TController>(
        string actionName,
        string permissionCode)
    {
        var method = typeof(TController).GetMethod(
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

    private static async Task AuthenticateAdminAsync(
        ApiWebApplicationFactory factory,
        HttpClient client)
    {
        var email = $"promotion-admin-{Guid.NewGuid():N}@example.com";
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
        var email = $"promotion-{role.ToLowerInvariant()}-{suffix}@example.com";

        using var response = await adminClient.PostAsJsonAsync(
            "/api/employees",
            new
            {
                employeeCode = $"EMP-{suffix[..8]}",
                ho = "Promotion",
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
        var data = json.RootElement.GetProperty("data");
        var token = data.GetProperty("token").GetString();

        Assert.False(string.IsNullOrWhiteSpace(token));

        return new EmployeeLogin(token!);
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

    private static async Task<JsonDocument> ReadJsonAsync(
        HttpResponseMessage response)
    {
        var content = await response.Content.ReadAsStringAsync();
        return JsonDocument.Parse(content);
    }

    private sealed record EmployeeAccount(string Email, string Password);

    private sealed record EmployeeLogin(string Token);
}
