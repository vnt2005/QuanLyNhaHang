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

public sealed class EmployeeAuthorizationTests
{
    [Theory]
    [InlineData(
        SystemRoles.Manager,
        "Kitchen.View|Kitchen.UpdateStatus|Payments.View|Payments.Create|" +
        "Payments.Update|Payments.Cancel|Invoices.View|Invoices.Manage|" +
        "Orders.View|Orders.Create|Orders.Update|Orders.Delete|" +
        "Inventory.View|Inventory.ManageCatalog|Inventory.Transact|" +
        "Inventory.Adjust|Reservations.View|Reservations.Create|" +
        "Reservations.Update|Reservations.Cancel|Menu.View|Menu.Manage|" +
        "Menu.UpdateAvailability|Tables.View|Tables.Manage|" +
        "Tables.UpdateStatus|RevenueReports.View|RevenueReports.Manage|" +
        "Dashboard.View",
        true,
        true,
        true,
        true,
        true,
        true,
        true,
        true,
        true,
        true)]
    [InlineData(
        SystemRoles.Cashier,
        "Orders.View|Payments.View|Payments.Create|Payments.Update|" +
        "Payments.Cancel|Invoices.View|Reservations.View|" +
        "Reservations.Create|Reservations.Update|Reservations.Cancel|" +
        "Menu.View|Tables.View|Tables.UpdateStatus",
        true,
        true,
        true,
        false,
        false,
        false,
        false,
        true,
        true,
        true)]
    [InlineData(
        SystemRoles.Kitchen,
        "Kitchen.View|Kitchen.UpdateStatus|Menu.View|" +
        "Menu.UpdateAvailability",
        false,
        false,
        false,
        false,
        false,
        true,
        false,
        false,
        true,
        false)]
    [InlineData(
        SystemRoles.Staff,
        "Orders.View|Orders.Create|Orders.Update|Reservations.View|" +
        "Reservations.Create|Reservations.Update|Reservations.Cancel|" +
        "Menu.View|Tables.View|Tables.UpdateStatus",
        true,
        false,
        false,
        false,
        false,
        false,
        false,
        true,
        true,
        true)]
    public async Task AdminCreatedEmployee_LoginReceivesLeastPrivilegeAccess(
        string role,
        string expectedCodes,
        bool canViewOrders,
        bool canViewPayments,
        bool canViewInvoices,
        bool canViewDashboard,
        bool canViewRevenueReports,
        bool canViewKitchen,
        bool canViewInventory,
        bool canManageReservations,
        bool canViewMenu,
        bool canOperateTables)
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

        Assert.Equal(role, login.Role);

        var expectedPermissions = expectedCodes.Split(
            '|',
            StringSplitOptions.RemoveEmptyEntries);

        Assert.Equal(
            expectedPermissions.OrderBy(x => x, StringComparer.Ordinal),
            login.Permissions.OrderBy(x => x, StringComparer.Ordinal));

        employeeClient.DefaultRequestHeaders.Authorization =
            new AuthenticationHeaderValue("Bearer", login.Token);

        await AssertAccessAsync(
            employeeClient,
            "/api/orders",
            canViewOrders);
        await AssertAccessAsync(
            employeeClient,
            "/api/payments",
            canViewPayments);
        await AssertAccessAsync(
            employeeClient,
            "/api/invoices",
            canViewInvoices);
        await AssertAccessAsync(
            employeeClient,
            "/api/dashboard",
            canViewDashboard);
        await AssertAccessAsync(
            employeeClient,
            "/api/revenue-reports",
            canViewRevenueReports);
        await AssertAccessAsync(
            employeeClient,
            "/api/kitchen/orders",
            canViewKitchen);

        await AssertAccessAsync(
            employeeClient,
            "/api/inventory-transactions",
            canViewInventory);
        await AssertAccessAsync(
            employeeClient,
            "/api/ingredients",
            canViewInventory);
        await AssertAccessAsync(
            employeeClient,
            "/api/ingredient-categories",
            canViewInventory);

        await AssertAccessAsync(
            employeeClient,
            "/api/reservations",
            canManageReservations);

        await AssertAccessAsync(
            employeeClient,
            "/api/menuitems",
            canViewMenu);
        await AssertAccessAsync(
            employeeClient,
            "/api/menucategories",
            canViewMenu);

        await AssertAccessAsync(
            employeeClient,
            "/api/restauranttables",
            canOperateTables);
        await AssertAccessAsync(
            employeeClient,
            "/api/areas",
            canOperateTables);
        await AssertAccessAsync(
            employeeClient,
            "/api/table-qr-codes",
            canOperateTables);

        using var employeesResponse = await employeeClient.GetAsync(
            "/api/employees");

        Assert.Equal(
            HttpStatusCode.Forbidden,
            employeesResponse.StatusCode);
    }

    [Fact]
    public async Task ConfiguredDatabasePermissions_OverrideRoleDefaults()
    {
        using var factory = new ApiWebApplicationFactory();
        using var adminClient = factory.CreateHttpsClient();
        await AuthenticateAdminAsync(factory, adminClient);

        using (var scope = factory.Services.CreateScope())
        {
            var context = scope.ServiceProvider
                .GetRequiredService<ApplicationDbContext>();

            var role = new Role(
                SystemRoles.Cashier,
                "Thu ngân",
                "Role được cấu hình riêng trong database");
            var permission = new Permission(
                PermissionCodes.OrdersView,
                "Xem order",
                "Orders",
                null);

            context.Roles.Add(role);
            context.Permissions.Add(permission);
            context.RolePermissions.Add(
                new RolePermission(role.Id, permission.Id));
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
            new[] { PermissionCodes.OrdersView },
            login.Permissions);

        employeeClient.DefaultRequestHeaders.Authorization =
            new AuthenticationHeaderValue("Bearer", login.Token);

        await AssertAccessAsync(
            employeeClient,
            "/api/orders",
            isAllowed: true);
        await AssertAccessAsync(
            employeeClient,
            "/api/payments",
            isAllowed: false);
        await AssertAccessAsync(
            employeeClient,
            "/api/invoices",
            isAllowed: false);
        await AssertAccessAsync(
            employeeClient,
            "/api/dashboard",
            isAllowed: false);
        await AssertAccessAsync(
            employeeClient,
            "/api/revenue-reports",
            isAllowed: false);
        await AssertAccessAsync(
            employeeClient,
            "/api/reservations",
            isAllowed: false);
    }

    [Fact]
    public async Task AdminUpdatesEmployeeRole_NewLoginUsesNewRolePermissions()
    {
        using var factory = new ApiWebApplicationFactory();
        using var adminClient = factory.CreateHttpsClient();
        await AuthenticateAdminAsync(factory, adminClient);

        var employee = await CreateEmployeeAsync(
            adminClient,
            SystemRoles.Staff);

        using var updateResponse = await adminClient.PutAsJsonAsync(
            $"/api/employees/{employee.Id}",
            new
            {
                id = employee.Id,
                employeeCode = employee.EmployeeCode,
                ho = "Integration",
                ten = "Employee",
                email = employee.Email,
                phoneNumber = employee.PhoneNumber,
                password = (string?)null,
                role = SystemRoles.Kitchen,
                dateOfBirth = new DateTime(1995, 1, 1),
                address = "Integration test",
                position = "Kitchen",
                baseSalary = 10_000_000m,
                hireDate = new DateTime(2026, 1, 1),
                isActive = true
            });

        Assert.Equal(HttpStatusCode.OK, updateResponse.StatusCode);

        using var employeeClient = factory.CreateHttpsClient();
        var login = await LoginAsync(
            employeeClient,
            employee.Email,
            employee.Password);

        Assert.Equal(SystemRoles.Kitchen, login.Role);
        Assert.Equal(
            new[]
            {
                PermissionCodes.KitchenView,
                PermissionCodes.KitchenUpdateStatus,
                PermissionCodes.MenuView,
                PermissionCodes.MenuUpdateAvailability
            }.OrderBy(x => x, StringComparer.Ordinal),
            login.Permissions.OrderBy(x => x, StringComparer.Ordinal));

        employeeClient.DefaultRequestHeaders.Authorization =
            new AuthenticationHeaderValue("Bearer", login.Token);

        await AssertAccessAsync(
            employeeClient,
            "/api/kitchen/orders",
            isAllowed: true);
        await AssertAccessAsync(
            employeeClient,
            "/api/orders",
            isAllowed: false);
        await AssertAccessAsync(
            employeeClient,
            "/api/menuitems",
            isAllowed: true);
        await AssertAccessAsync(
            employeeClient,
            "/api/inventory-transactions",
            isAllowed: false);
    }

    [Fact]
    public async Task AdminDeactivatesEmployee_EmployeeCanNoLongerLogin()
    {
        using var factory = new ApiWebApplicationFactory();
        using var adminClient = factory.CreateHttpsClient();
        await AuthenticateAdminAsync(factory, adminClient);

        var employee = await CreateEmployeeAsync(
            adminClient,
            SystemRoles.Staff);

        using var deleteResponse = await adminClient.DeleteAsync(
            $"/api/employees/{employee.Id}");

        Assert.Equal(HttpStatusCode.OK, deleteResponse.StatusCode);

        using var employeeClient = factory.CreateHttpsClient();
        using var loginResponse = await employeeClient.PostAsJsonAsync(
            "/api/auth/login",
            new
            {
                email = employee.Email,
                password = employee.Password
            });

        Assert.Equal(
            HttpStatusCode.Unauthorized,
            loginResponse.StatusCode);
    }

    private static async Task AuthenticateAdminAsync(
        ApiWebApplicationFactory factory,
        HttpClient client)
    {
        var email = $"employee-admin-{Guid.NewGuid():N}@example.com";
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
        var password = "Employee123!";
        var employeeCode = $"EMP-{suffix[..8]}";
        var email = $"employee-{role.ToLowerInvariant()}-{suffix}@example.com";
        var phoneNumber =
            $"09{Random.Shared.Next(10_000_000, 99_999_999)}";

        using var response = await adminClient.PostAsJsonAsync(
            "/api/employees",
            new
            {
                employeeCode,
                ho = "Integration",
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

        using var json = await ReadJsonAsync(response);
        var id = json.RootElement.GetProperty("id").GetGuid();

        return new EmployeeAccount(
            id,
            employeeCode,
            email,
            phoneNumber,
            password);
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

        return new EmployeeLogin(
            data.GetProperty("role").GetString()!,
            token!,
            permissions);
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

    private sealed record EmployeeAccount(
        Guid Id,
        string EmployeeCode,
        string Email,
        string PhoneNumber,
        string Password);

    private sealed record EmployeeLogin(
        string Role,
        string Token,
        string[] Permissions);
}
