using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using QuanLyNhaHang.Domain.Entities;
using QuanLyNhaHang.Infrastructure.Persistence;
using QuanLyNhaHang.IntegrationTests.Infrastructure;
using Xunit;

namespace QuanLyNhaHang.IntegrationTests.Business;

public sealed class OrderPaymentWorkflowTests
{
    [Theory]
    [InlineData("/api/orders")]
    [InlineData("/api/payments")]
    [InlineData("/api/inventory-transactions")]
    [InlineData("/api/reservations")]
    [InlineData("/api/menuitems")]
    [InlineData("/api/restauranttables")]
    [InlineData("/api/kitchen/orders")]
    public async Task CriticalBusinessEndpoints_RequireAuthentication(string endpoint)
    {
        using var factory = new ApiWebApplicationFactory();
        using var client = factory.CreateHttpsClient();

        using var response = await client.GetAsync(endpoint);

        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);
    }

    [Fact]
    public async Task CompleteOrder_AfterAllItemsAreServed_Succeeds()
    {
        using var factory = new ApiWebApplicationFactory();
        using var client = factory.CreateHttpsClient();
        await AuthenticateAdminAsync(factory, client);

        var scenario = await SeedOrderingScenarioAsync(factory);
        var orderId = await CreateOrderAsync(client, scenario);

        await MoveOrderToServedAsync(client, orderId);

        using var completeResponse = await ChangeOrderStatusAsync(
            client,
            orderId,
            "Completed");

        Assert.Equal(HttpStatusCode.OK, completeResponse.StatusCode);

        using var scope = factory.Services.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();

        var order = await context.Orders
            .AsNoTracking()
            .SingleAsync(x => x.Id == orderId);
        var table = await context.RestaurantTables
            .AsNoTracking()
            .SingleAsync(x => x.Id == scenario.TableId);
        var items = await context.OrderItems
            .AsNoTracking()
            .Where(x => x.OrderId == orderId)
            .ToListAsync();

        Assert.Equal("Completed", order.Status);
        Assert.Equal("Available", table.Status);
        Assert.All(items, item => Assert.Equal("Served", item.Status));
    }

    [Fact]
    public async Task AdminPaymentMutations_AreMethodNotAllowed()
    {
        using var factory = new ApiWebApplicationFactory();
        using var client = factory.CreateHttpsClient();
        await AuthenticateAdminAsync(factory, client);

        using var postResponse = await client.PostAsJsonAsync(
            "/api/payments",
            new { orderId = Guid.NewGuid(), paymentMethod = "Cash", customerPaid = 1m });
        Assert.Equal(HttpStatusCode.MethodNotAllowed, postResponse.StatusCode);

        var paymentId = Guid.NewGuid();
        using var putResponse = await client.PutAsJsonAsync(
            $"/api/payments/{paymentId}",
            new { customerPaid = 1m });
        Assert.Equal(HttpStatusCode.MethodNotAllowed, putResponse.StatusCode);

        using var deleteResponse = await client.DeleteAsync($"/api/payments/{paymentId}");
        Assert.Equal(HttpStatusCode.MethodNotAllowed, deleteResponse.StatusCode);
    }

    private static async Task AuthenticateAdminAsync(
        ApiWebApplicationFactory factory,
        HttpClient client)
    {
        var email = $"business-{Guid.NewGuid():N}@example.com";
        const string password = "Password123!";

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

    private static async Task<OrderingScenario> SeedOrderingScenarioAsync(
        ApiWebApplicationFactory factory)
    {
        using var scope = factory.Services.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        await context.Database.EnsureCreatedAsync();

        var area = new Area($"Khu vực {Guid.NewGuid():N}", "Dữ liệu integration test");
        var table = new RestaurantTable(area.Id, $"Bàn {Guid.NewGuid():N}", 4, null);
        var category = new MenuCategory($"Danh mục {Guid.NewGuid():N}", null, 1);
        var firstItem = new MenuItem(category.Id, "Cơm gà", null, 100_000m, null);
        var secondItem = new MenuItem(category.Id, "Nước ép", null, 50_000m, null);

        context.Areas.Add(area);
        context.RestaurantTables.Add(table);
        context.MenuCategories.Add(category);
        context.MenuItems.AddRange(firstItem, secondItem);
        await context.SaveChangesAsync();

        return new OrderingScenario(table.Id, firstItem.Id, secondItem.Id);
    }

    private static async Task<Guid> CreateOrderAsync(
        HttpClient client,
        OrderingScenario scenario)
    {
        using var response = await client.PostAsJsonAsync(
            "/api/orders",
            new
            {
                restaurantTableId = scenario.TableId,
                note = "Integration test",
                items = new[]
                {
                    new { menuItemId = scenario.FirstMenuItemId, quantity = 2, note = (string?)null },
                    new { menuItemId = scenario.SecondMenuItemId, quantity = 1, note = (string?)"Ít đá" }
                }
            });

        Assert.Equal(HttpStatusCode.Created, response.StatusCode);
        using var json = await ReadJsonAsync(response);
        return json.RootElement.GetProperty("id").GetGuid();
    }

    private static async Task MoveOrderToServedAsync(HttpClient client, Guid orderId)
    {
        using var cookingResponse = await ChangeOrderStatusAsync(client, orderId, "Cooking");
        Assert.Equal(HttpStatusCode.OK, cookingResponse.StatusCode);

        using var orderResponse = await client.GetAsync($"/api/orders/{orderId}");
        Assert.Equal(HttpStatusCode.OK, orderResponse.StatusCode);

        using var orderJson = await ReadJsonAsync(orderResponse);
        var itemIds = orderJson.RootElement
            .GetProperty("items")
            .EnumerateArray()
            .Select(item => item.GetProperty("id").GetGuid())
            .ToArray();

        Assert.NotEmpty(itemIds);
        foreach (var itemId in itemIds)
        {
            using var readyResponse = await client.PatchAsJsonAsync(
                $"/api/kitchen/order-items/{itemId}/status",
                new { status = "Ready", note = (string?)null });
            Assert.Equal(HttpStatusCode.OK, readyResponse.StatusCode);
        }

        using var servedResponse = await ChangeOrderStatusAsync(client, orderId, "Served");
        Assert.Equal(HttpStatusCode.OK, servedResponse.StatusCode);
    }

    private static Task<HttpResponseMessage> ChangeOrderStatusAsync(
        HttpClient client,
        Guid orderId,
        string status)
    {
        return client.PatchAsJsonAsync(
            $"/api/orders/{orderId}/status",
            new { id = orderId, status });
    }

    private static async Task<JsonDocument> ReadJsonAsync(HttpResponseMessage response)
    {
        var content = await response.Content.ReadAsStringAsync();
        return JsonDocument.Parse(content);
    }

    private sealed record OrderingScenario(
        Guid TableId,
        Guid FirstMenuItemId,
        Guid SecondMenuItemId);
}
