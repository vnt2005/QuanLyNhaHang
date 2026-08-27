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

namespace QuanLyNhaHang.IntegrationTests.Business;

public sealed class CustomerOrderCancellationTests
{
    [Fact]
    public async Task Customer_CanCancelOwnPendingOrder_AndBothSidesAreNotified()
    {
        const string password = "Password123!";
        using var factory = new ApiWebApplicationFactory();
        var adminUserId = await factory.SeedUserAsync(
            $"cancel-admin-{Guid.NewGuid():N}@example.com",
            password);
        var scenario = await SeedQrScenarioAsync(factory);

        using var customerClient = factory.CreateHttpsClient();
        var customerUserId = await AuthenticateCustomerAsync(
            factory,
            customerClient,
            $"cancel-customer-{Guid.NewGuid():N}@example.com",
            password);

        var orderId = await CreateCustomerOrderAsync(
            customerClient,
            scenario);

        using var cancelResponse = await customerClient.PostAsync(
            $"/api/customer/orders/{orderId}/cancel",
            null);

        Assert.Equal(HttpStatusCode.OK, cancelResponse.StatusCode);

        using var scope = factory.Services.CreateScope();
        var context = scope.ServiceProvider
            .GetRequiredService<ApplicationDbContext>();

        var order = await context.Orders
            .AsNoTracking()
            .SingleAsync(item => item.Id == orderId);
        Assert.Equal("Cancelled", order.Status);

        var orderItems = await context.OrderItems
            .AsNoTracking()
            .Where(item => item.OrderId == orderId)
            .ToListAsync();
        Assert.NotEmpty(orderItems);
        Assert.All(orderItems, item => Assert.Equal("Cancelled", item.Status));

        Assert.True(await context.Notifications
            .AsNoTracking()
            .AnyAsync(item =>
                item.UserId == customerUserId &&
                item.EntityId == orderId &&
                item.Type == "Order.CancelledByCustomer"));

        Assert.True(await context.Notifications
            .AsNoTracking()
            .AnyAsync(item =>
                item.UserId == adminUserId &&
                item.EntityId == orderId &&
                item.Type == "Order.CancelledByCustomer"));
    }

    [Fact]
    public async Task Customer_CannotSelfCancelPaidPendingOrder()
    {
        const string password = "Password123!";
        using var factory = new ApiWebApplicationFactory();
        var scenario = await SeedQrScenarioAsync(factory);

        using var customerClient = factory.CreateHttpsClient();
        await AuthenticateCustomerAsync(
            factory,
            customerClient,
            $"cancel-paid-{Guid.NewGuid():N}@example.com",
            password);

        var orderId = await CreateCustomerOrderAsync(
            customerClient,
            scenario);

        using (var paymentScope = factory.Services.CreateScope())
        {
            var context = paymentScope.ServiceProvider
                .GetRequiredService<ApplicationDbContext>();
            var order = await context.Orders
                .SingleAsync(item => item.Id == orderId);

            context.Payments.Add(new Payment(
                order.Id,
                order.TotalAmount,
                0m,
                0m,
                order.TotalAmount,
                "BankTransfer",
                "Thanh toán test trước khi bếp xử lý"));
            await context.SaveChangesAsync();
        }

        using var cancelResponse = await customerClient.PostAsync(
            $"/api/customer/orders/{orderId}/cancel",
            null);

        Assert.Equal(HttpStatusCode.BadRequest, cancelResponse.StatusCode);
        using var json = await ReadJsonAsync(cancelResponse);
        Assert.Contains(
            "đã thanh toán",
            json.RootElement.GetProperty("message").GetString());

        using var verificationScope = factory.Services.CreateScope();
        var verificationContext = verificationScope.ServiceProvider
            .GetRequiredService<ApplicationDbContext>();
        var persistedOrder = await verificationContext.Orders
            .AsNoTracking()
            .SingleAsync(item => item.Id == orderId);
        Assert.Equal("Pending", persistedOrder.Status);
    }

    private static async Task<Guid> CreateCustomerOrderAsync(
        HttpClient client,
        QrScenario scenario)
    {
        using var response = await client.PostAsJsonAsync(
            "/api/customer/orders",
            new
            {
                token = scenario.Token,
                note = "Đơn test hủy từ CustomerWeb",
                items = new[]
                {
                    new
                    {
                        menuItemId = scenario.MenuItemId,
                        quantity = 2
                    }
                }
            });

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        using var json = await ReadJsonAsync(response);
        return json.RootElement
            .GetProperty("data")
            .GetProperty("id")
            .GetGuid();
    }

    private static async Task<QrScenario> SeedQrScenarioAsync(
        ApiWebApplicationFactory factory)
    {
        using var scope = factory.Services.CreateScope();
        var context = scope.ServiceProvider
            .GetRequiredService<ApplicationDbContext>();
        await context.Database.EnsureCreatedAsync();

        var area = new Area($"Khu hủy {Guid.NewGuid():N}", null);
        var table = new RestaurantTable(
            area.Id,
            $"Bàn hủy {Guid.NewGuid():N}"[..20],
            4,
            null);
        var category = new MenuCategory(
            $"Món hủy {Guid.NewGuid():N}"[..20],
            null,
            1);
        var menuItem = new MenuItem(
            category.Id,
            $"Món test hủy {Guid.NewGuid():N}"[..30],
            null,
            75_000m,
            null);
        var token = $"customer-cancel-{Guid.NewGuid():N}";
        var qrCode = new TableQrCode(
            table.Id,
            token,
            $"https://restaurant.example/qr-order/{token}",
            null);

        context.Areas.Add(area);
        context.RestaurantTables.Add(table);
        context.MenuCategories.Add(category);
        context.MenuItems.Add(menuItem);
        context.TableQrCodes.Add(qrCode);
        await context.SaveChangesAsync();

        return new QrScenario(token, menuItem.Id);
    }

    private static async Task<Guid> AuthenticateCustomerAsync(
        ApiWebApplicationFactory factory,
        HttpClient client,
        string email,
        string password)
    {
        var userId = await factory.SeedUserAsync(
            email,
            password,
            role: SystemRoles.Customer);

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
        return userId;
    }

    private static async Task<JsonDocument> ReadJsonAsync(
        HttpResponseMessage response)
    {
        var content = await response.Content.ReadAsStringAsync();
        return JsonDocument.Parse(content);
    }

    private sealed record QrScenario(
        string Token,
        Guid MenuItemId);
}
