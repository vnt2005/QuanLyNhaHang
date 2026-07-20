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
    public static IEnumerable<object[]> RoleCases()
    {
        yield return new object[]
        {
            SystemRoles.Manager,
            "Kitchen.View|Kitchen.UpdateStatus|Payments.View|Payments.Create|" +
            "Payments.Update|Payments.Cancel|Invoices.View|Invoices.Manage|" +
            "Orders.View|Orders.Create|Orders.Update|Orders.Delete|" +
            "Inventory.View|Inventory.ManageCatalog|Inventory.Transact|" +
            "Inventory.Adjust|Reservations.View|Reservations.Create|" +
            "Reservations.Update|Reservations.Cancel|Menu.View|Menu.Manage|" +
            "Menu.UpdateAvailability|Tables.View|Tables.Manage|" +
            "Tables.UpdateStatus|Employees.View|Promotions.View|" +
            "Promotions.Manage|Promotions.Apply|PromotionUsages.View|" +
            "PromotionUsages.UpdatePayment|PromotionUsages.Cancel|" +
            "RestaurantSettings.View|RestaurantSettings.Manage|ActivityLogs.View|" +
            "Shifts.View|Shifts.Manage|EmployeeShifts.View|" +
            "EmployeeShifts.Manage|RevenueReports.View|" +
            "RevenueReports.Manage|Dashboard.View",
            true, true, true, true, true, true, true,
            true, true, true, true, true, true, true, true
        };

        yield return new object[]
        {
            SystemRoles.Cashier,
            "Orders.View|Payments.View|Payments.Create|Payments.Update|" +
            "Payments.Cancel|Invoices.View|Reservations.View|" +
            "Reservations.Create|Reservations.Update|Reservations.Cancel|" +
            "Menu.View|Tables.View|Tables.UpdateStatus|Promotions.View|" +
            "Promotions.Apply|PromotionUsages.View|" +
            "PromotionUsages.UpdatePayment|PromotionUsages.Cancel|" +
            "RestaurantSettings.View",
            true, true, true, false, false, false, false,
            true, true, true, false, false, true, true, false
        };

        yield return new object[]
        {
            SystemRoles.Kitchen,
            "Kitchen.View|Kitchen.UpdateStatus|Menu.View|" +
            "Menu.UpdateAvailability",
            false, false, false, false, false, true, false,
            false, true, false, false, false, false, false, false
        };

        yield return new object[]
        {
            SystemRoles.Staff,
            "Orders.View|Orders.Create|Orders.Update|Reservations.View|" +
            "Reservations.Create|Reservations.Update|Reservations.Cancel|" +
            "Menu.View|Tables.View|Tables.UpdateStatus",
            true, false, false, false, false, false, false,
            true, true, true, false, false, false, false, false
        };
    }

    [Theory]
    [MemberData(nameof(RoleCases))]
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
        bool canOperateTables,
        bool canManageScheduling,
        bool canViewEmployees,
        bool canOperatePromotions,
        bool canViewRestaurantSettings,
        bool canViewActivityLogs)
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

        await AssertAccessAsync(employeeClient, "/api/orders", canViewOrders);
        await AssertAccessAsync(employeeClient, "/api/payments", canViewPayments);
        await AssertAccessAsync(employeeClient, "/api/invoices", canViewInvoices);
        await AssertAccessAsync(employeeClient, "/api/dashboard", canViewDashboard);
        await AssertAccessAsync(
            employeeClient,
            "/api/revenue-reports",
            canViewRevenueReports);
        await AssertAccessAsync(
            employeeClient,
            "/api/kitchen/orders",
            canViewKitchen);

        foreach (var endpoint in new[]
                 {
                     "/api/inventory-transactions",
                     "/api/ingredients",
                     "/api/ingredient-categories"
                 })
        {
            await AssertAccessAsync(employeeClient, endpoint, canViewInventory);
        }

        await AssertAccessAsync(
            employeeClient,
            "/api/reservations",
            canManageReservations);

        foreach (var endpoint in new[]
                 {
                     "/api/menuitems",
                     "/api/menucategories"
                 })
        {
            await AssertAccessAsync(employeeClient, endpoint, canViewMenu);
        }

        foreach (var endpoint in new[]
                 {
                     "/api/restauranttables",
                     "/api/areas",
                     "/api/table-qr-codes"
                 })
        {
            await AssertAccessAsync(employeeClient, endpoint, canOperateTables);
        }

        await AssertAccessAsync(
            employeeClient,
            "/api/shifts",
            canManageScheduling);
        await AssertAccessAsync(
            employeeClient,
            "/api/employeeshifts",
            canManageScheduling);
        await AssertAccessAsync(
            employeeClient,
            "/api/employees",
            canViewEmployees);
        await AssertAccessAsync(employeeClient, "/api/users", false);
        await AssertAccessAsync(
            employeeClient,
            "/api/promotions",
            canOperatePromotions);
        await AssertAccessAsync(
            employeeClient,
            "/api/promotion-usages",
            canOperatePromotions);
        await AssertAccessAsync(
            employeeClient,
            "/api/restaurant-settings",
            canViewRestaurantSettings);
        await AssertAccessAsync(
            employeeClient,
            "/api/activity-logs",
            canViewActivityLogs);
    }

    [Fact]
    public async Task Manager_CannotCreateEmployeesWithoutManagePermission()
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

        var suffix = Guid.NewGuid().ToString("N");
        using var response = await managerClient.PostAsJsonAsync(
            "/api/employees",
            CreateEmployeePayload(suffix, SystemRoles.Staff));

        Assert.Equal(HttpStatusCode.Forbidden, response.StatusCode);
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

        await AssertAccessAsync(employeeClient, "/api/orders", true);

        foreach (var endpoint in new[]
                 {
                     "/api/payments",
                     "/api/invoices",
                     "/api/dashboard",
                     "/api/revenue-reports",
                     "/api/reservations",
                     "/api/shifts",
                     "/api/employeeshifts",
                     "/api/employees",
                     "/api/users",
                     "/api/promotions",
                     "/api/promotion-usages",
                     "/api/restaurant-settings",
                     "/api/activity-logs"
                 })
        {
            await AssertAccessAsync(employeeClient, endpoint, false);
        }
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

        await AssertAccessAsync(employeeClient, "/api/kitchen/orders", true);
        await AssertAccessAsync(employeeClient, "/api/orders", false);
        await AssertAccessAsync(employeeClient, "/api/menuitems", true);
        await AssertAccessAsync(
            employeeClient,
            "/api/inventory-transactions",
            false);
        await AssertAccessAsync(employeeClient, "/api/shifts", false);
        await AssertAccessAsync(employeeClient, "/api/employeeshifts", false);
        await AssertAccessAsync(employeeClient, "/api/employees", false);
        await AssertAccessAsync(employeeClient, "/api/users", false);
        await AssertAccessAsync(employeeClient, "/api/promotions", false);
        await AssertAccessAsync(employeeClient, "/api/promotion-usages", false);
        await AssertAccessAsync(employeeClient, "/api/restaurant-settings", false);
        await AssertAccessAsync(employeeClient, "/api/activity-logs", false);
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

        Assert.Equal(HttpStatusCode.Unauthorized, loginResponse.StatusCode);
    }

    private static async Task AuthenticateAdminAsync(
        ApiWebApplicationFactory factory,
        HttpClient client)
    {
        var suffix = Guid.NewGuid().ToString("N");
        var email = $"employee-admin-{suffix}@example.com";
        var password = $"Test-{suffix[..12]}!Aa1";

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
        var payload = CreateEmployeePayload(suffix, role);

        using var response = await adminClient.PostAsJsonAsync(
            "/api/employees",
            payload);

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);

        using var json = await ReadJsonAsync(response);
        var id = json.RootElement.GetProperty("id").GetGuid();

        return new EmployeeAccount(
            id,
            payload.employeeCode,
            payload.email,
            payload.phoneNumber,
            payload.password);
    }

    private static EmployeePayload CreateEmployeePayload(
        string suffix,
        string role)
    {
        return new EmployeePayload(
            $"EMP-{suffix[..8]}",
            $"employee-{role.ToLowerInvariant()}-{suffix}@example.com",
            $"09{Random.Shared.Next(10_000_000, 99_999_999)}",
            $"Test-{suffix[..12]}!Aa1",
            role);
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

    private sealed record EmployeePayload(
        string employeeCode,
        string email,
        string phoneNumber,
        string password,
        string role)
    {
        public string ho => "Integration";
        public string ten => "Employee";
        public DateTime dateOfBirth => new(1995, 1, 1);
        public string address => "Integration test";
        public string position => role;
        public decimal baseSalary => 10_000_000m;
        public DateTime hireDate => new(2026, 1, 1);
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
