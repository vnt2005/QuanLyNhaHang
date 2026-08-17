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

public sealed class TakeawayOrderTests
{
    [Fact]
    public async Task GuestTakeawayOrder_DoesNotRequireTableOrQr_AndDoesNotOccupyTable()
    {
        using var factory = new ApiWebApplicationFactory();
        var adminUserId = await factory.SeedUserAsync(
            $"takeaway-admin-{Guid.NewGuid():N}@example.com",
            "Password123!");
        var scenario = await SeedScenarioAsync(factory);
        using var client = factory.CreateHttpsClient();

        using var response = await client.PostAsJsonAsync(
            "/api/customer-site/takeaway-orders",
            new
            {
                customerName = "Khách mang về",
                phoneNumber = "0901234567",
                note = "Không hành",
                items = new[]
                {
                    new { menuItemId = scenario.MenuItemId, quantity = 2 }
                }
            });

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        using var json = await ReadJsonAsync(response);
        var data = json.RootElement.GetProperty("data");
        var orderId = data.GetProperty("id").GetGuid();

        Assert.Equal("Takeaway", data.GetProperty("orderType").GetString());
        Assert.Equal(JsonValueKind.Null, data.GetProperty("restaurantTableId").ValueKind);
        Assert.Equal("Mang về", data.GetProperty("restaurantTableName").GetString());

        using var scope = factory.Services.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        var order = await context.Orders.AsNoTracking().SingleAsync(x => x.Id == orderId);
        var table = await context.RestaurantTables.AsNoTracking().SingleAsync(x => x.Id == scenario.TableId);
        var notification = await context.Notifications.AsNoTracking().SingleAsync(x => x.UserId == adminUserId && x.EntityId == orderId);

        Assert.Null(order.RestaurantTableId);
        Assert.Equal("Takeaway", order.OrderType);
        Assert.Equal("Khách mang về", order.CustomerName);
        Assert.Equal("Available", table.Status);
        Assert.Equal("Order.CreatedFromCustomer", notification.Type);
        Assert.Equal("Đơn mang về mới", notification.Title);
    }

    [Fact]
    public async Task AuthenticatedTakeawayOrder_IsSavedInCustomerHistory()
    {
        const string password = "Password123!";
        using var factory = new ApiWebApplicationFactory();
        var scenario = await SeedScenarioAsync(factory);
        using var client = factory.CreateHttpsClient();
        await AuthenticateCustomerAsync(factory, client, "takeaway-history@example.com", password);

        using var createResponse = await client.PostAsJsonAsync(
            "/api/customer-site/takeaway-orders",
            new
            {
                customerName = "Thanh Takeaway",
                phoneNumber = "0912345678",
                pickupTime = DateTime.UtcNow.AddMinutes(30),
                items = new[]
                {
                    new { menuItemId = scenario.MenuItemId, quantity = 1 }
                }
            });

        Assert.Equal(HttpStatusCode.OK, createResponse.StatusCode);
        using var createJson = await ReadJsonAsync(createResponse);
        var orderId = createJson.RootElement.GetProperty("data").GetProperty("id").GetGuid();

        using var historyResponse = await client.GetAsync("/api/customer/orders?pageNumber=1&pageSize=10");
        Assert.Equal(HttpStatusCode.OK, historyResponse.StatusCode);
        using var historyJson = await ReadJsonAsync(historyResponse);
        var historyOrder = Assert.Single(historyJson.RootElement.GetProperty("items").EnumerateArray());

        Assert.Equal(orderId, historyOrder.GetProperty("id").GetGuid());
        Assert.Equal("Takeaway", historyOrder.GetProperty("orderType").GetString());
        Assert.Equal("Mang về", historyOrder.GetProperty("restaurantTableName").GetString());
        Assert.Equal(JsonValueKind.Null, historyOrder.GetProperty("restaurantTableId").ValueKind);
        Assert.Equal("Thanh Takeaway", historyOrder.GetProperty("customerName").GetString());
    }

    private static async Task<TakeawayScenario> SeedScenarioAsync(ApiWebApplicationFactory factory)
    {
        using var scope = factory.Services.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        await context.Database.EnsureCreatedAsync();

        var area = new Area("Khu takeaway", null);
        var table = new RestaurantTable(area.Id, "Bàn không dùng cho takeaway", 4, null);
        var category = new MenuCategory("Món takeaway", null, 1);
        var menuItem = new MenuItem(category.Id, "Cơm gà mang về", null, 85_000m, null);

        context.Areas.Add(area);
        context.RestaurantTables.Add(table);
        context.MenuCategories.Add(category);
        context.MenuItems.Add(menuItem);
        await context.SaveChangesAsync();

        return new TakeawayScenario(table.Id, menuItem.Id);
    }

    private static async Task AuthenticateCustomerAsync(
        ApiWebApplicationFactory factory,
        HttpClient client,
        string email,
        string password)
    {
        await factory.SeedUserAsync(email, password, role: SystemRoles.Customer);

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

    private sealed record TakeawayScenario(Guid TableId, Guid MenuItemId);
}
