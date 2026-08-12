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

namespace QuanLyNhaHang.IntegrationTests.Business;

public sealed class CustomerOrderHistoryTests
{
    [Fact]
    public async Task History_RequiresCustomerAuthentication()
    {
        using var factory = new ApiWebApplicationFactory();
        using var client = factory.CreateHttpsClient();

        using var response = await client.GetAsync("/api/customer/orders");

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task CustomerOrder_IsStoredInOwnHistoryAndHiddenFromOtherCustomer()
    {
        const string password = "Password123!";
        using var factory = new ApiWebApplicationFactory();
        var scenario = await SeedQrScenarioAsync(factory);

        using var customerClient = factory.CreateHttpsClient();
        await AuthenticateCustomerAsync(
            factory,
            customerClient,
            "history-owner@example.com",
            password);

        using var createResponse = await customerClient.PostAsJsonAsync(
            "/api/customer/orders",
            new
            {
                token = scenario.Token,
                note = "Ít cay",
                items = new[]
                {
                    new
                    {
                        menuItemId = scenario.MenuItemId,
                        quantity = 2,
                        note = "Không hành"
                    }
                }
            });

        Assert.Equal(HttpStatusCode.OK, createResponse.StatusCode);
        using var createJson = await ReadJsonAsync(createResponse);
        var createdOrder = createJson.RootElement.GetProperty("data");
        var orderId = createdOrder.GetProperty("id").GetGuid();

        using var historyResponse = await customerClient.GetAsync(
            "/api/customer/orders?pageNumber=1&pageSize=10");

        Assert.Equal(HttpStatusCode.OK, historyResponse.StatusCode);
        using var historyJson = await ReadJsonAsync(historyResponse);
        var historyItems = historyJson.RootElement.GetProperty("items");
        var historyOrder = Assert.Single(historyItems.EnumerateArray());

        Assert.Equal(orderId, historyOrder.GetProperty("id").GetGuid());
        Assert.Equal("Bàn lịch sử", historyOrder
            .GetProperty("restaurantTableName")
            .GetString());
        Assert.Equal(2, Assert.Single(historyOrder
            .GetProperty("items")
            .EnumerateArray())
            .GetProperty("quantity")
            .GetInt32());

        using var otherCustomerClient = factory.CreateHttpsClient();
        await AuthenticateCustomerAsync(
            factory,
            otherCustomerClient,
            "history-other@example.com",
            password);

        using var otherHistoryResponse = await otherCustomerClient.GetAsync(
            "/api/customer/orders");

        Assert.Equal(HttpStatusCode.OK, otherHistoryResponse.StatusCode);
        using var otherHistoryJson = await ReadJsonAsync(otherHistoryResponse);
        Assert.Empty(otherHistoryJson.RootElement
            .GetProperty("items")
            .EnumerateArray());
    }

    [Fact]
    public async Task GuestOrder_CanBeClaimedAfterCustomerLogsIn()
    {
        const string password = "Password123!";
        using var factory = new ApiWebApplicationFactory();
        var scenario = await SeedQrScenarioAsync(factory);

        using var guestClient = factory.CreateHttpsClient();
        using var createResponse = await guestClient.PostAsJsonAsync(
            $"/api/qr-order/{scenario.Token}/orders",
            new
            {
                note = "Khách đăng nhập sau",
                items = new[]
                {
                    new
                    {
                        menuItemId = scenario.MenuItemId,
                        quantity = 1
                    }
                }
            });

        Assert.Equal(HttpStatusCode.OK, createResponse.StatusCode);
        using var createJson = await ReadJsonAsync(createResponse);
        var orderId = createJson.RootElement
            .GetProperty("data")
            .GetProperty("id")
            .GetGuid();

        using var customerClient = factory.CreateHttpsClient();
        await AuthenticateCustomerAsync(
            factory,
            customerClient,
            "claim-order@example.com",
            password);

        using var claimResponse = await customerClient.PostAsJsonAsync(
            $"/api/customer/orders/{orderId}/claim",
            new { token = scenario.Token });

        Assert.Equal(HttpStatusCode.OK, claimResponse.StatusCode);

        using var historyResponse = await customerClient.GetAsync(
            "/api/customer/orders");
        Assert.Equal(HttpStatusCode.OK, historyResponse.StatusCode);

        using var historyJson = await ReadJsonAsync(historyResponse);
        var historyOrder = Assert.Single(historyJson.RootElement
            .GetProperty("items")
            .EnumerateArray());
        Assert.Equal(orderId, historyOrder.GetProperty("id").GetGuid());

        using var otherCustomerClient = factory.CreateHttpsClient();
        await AuthenticateCustomerAsync(
            factory,
            otherCustomerClient,
            "claim-conflict@example.com",
            password);

        using var conflictResponse = await otherCustomerClient.PostAsJsonAsync(
            $"/api/customer/orders/{orderId}/claim",
            new { token = scenario.Token });

        Assert.Equal(HttpStatusCode.BadRequest, conflictResponse.StatusCode);
    }

    private static async Task<QrScenario> SeedQrScenarioAsync(
        ApiWebApplicationFactory factory)
    {
        using var scope = factory.Services.CreateScope();
        var context = scope.ServiceProvider
            .GetRequiredService<ApplicationDbContext>();
        await context.Database.EnsureCreatedAsync();

        var area = new Area("Khu lịch sử", null);
        var table = new RestaurantTable(
            area.Id,
            "Bàn lịch sử",
            4,
            null);
        var category = new MenuCategory("Món lịch sử", null, 1);
        var menuItem = new MenuItem(
            category.Id,
            "Cơm gà lịch sử",
            null,
            75_000m,
            null);
        var token = $"customer-history-{Guid.NewGuid():N}";
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

    private static async Task AuthenticateCustomerAsync(
        ApiWebApplicationFactory factory,
        HttpClient client,
        string email,
        string password)
    {
        await factory.SeedUserAsync(
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

