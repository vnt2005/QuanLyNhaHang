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

public sealed class CustomerOrderCancellationAbuseTests
{
    [Fact]
    public async Task Customer_CancelThenImmediateReorder_IsBlockedByCooldown()
    {
        const string password = "Password123!";
        using var factory = new ApiWebApplicationFactory();
        var scenario = await SeedQrScenarioAsync(factory);

        using var customerClient = factory.CreateHttpsClient();
        await AuthenticateCustomerAsync(
            factory,
            customerClient,
            $"cancel-abuse-{Guid.NewGuid():N}@example.com",
            password);

        var firstOrderId = await CreateCustomerOrderAsync(
            customerClient,
            scenario,
            expectSuccess: true);

        using var cancelResponse = await customerClient.PostAsync(
            $"/api/customer/orders/{firstOrderId}/cancel",
            null);
        Assert.Equal(HttpStatusCode.OK, cancelResponse.StatusCode);

        using var reorderResponse = await PostCustomerOrderAsync(
            customerClient,
            scenario);

        Assert.Equal(HttpStatusCode.BadRequest, reorderResponse.StatusCode);
        using var json = await ReadJsonAsync(reorderResponse);
        var message = json.RootElement.GetProperty("message").GetString();
        Assert.Contains("hủy đơn liên tục", message);
        Assert.Contains("5 phút", message);
    }

    private static async Task<Guid> CreateCustomerOrderAsync(
        HttpClient client,
        QrScenario scenario,
        bool expectSuccess)
    {
        using var response = await PostCustomerOrderAsync(client, scenario);

        if (!expectSuccess)
            return Guid.Empty;

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        using var json = await ReadJsonAsync(response);
        return json.RootElement
            .GetProperty("data")
            .GetProperty("id")
            .GetGuid();
    }

    private static Task<HttpResponseMessage> PostCustomerOrderAsync(
        HttpClient client,
        QrScenario scenario)
    {
        return client.PostAsJsonAsync(
            "/api/customer/orders",
            new
            {
                token = scenario.Token,
                note = "Test chống đặt-hủy liên tục",
                items = new[]
                {
                    new
                    {
                        menuItemId = scenario.MenuItemId,
                        quantity = 1
                    }
                }
            });
    }

    private static async Task<QrScenario> SeedQrScenarioAsync(
        ApiWebApplicationFactory factory)
    {
        using var scope = factory.Services.CreateScope();
        var context = scope.ServiceProvider
            .GetRequiredService<ApplicationDbContext>();
        await context.Database.EnsureCreatedAsync();

        var suffix = Guid.NewGuid().ToString("N");
        var area = new Area(
            $"Khu abuse {suffix}"[..20],
            null);
        var table = new RestaurantTable(
            area.Id,
            $"Bàn {suffix}"[..20],
            4,
            null);
        var category = new MenuCategory(
            $"Danh mục {suffix}"[..20],
            null,
            1);
        var menuItem = new MenuItem(
            category.Id,
            $"Món abuse {suffix}"[..30],
            null,
            50_000m,
            null);
        var token = $"cancel-abuse-{Guid.NewGuid():N}";
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
