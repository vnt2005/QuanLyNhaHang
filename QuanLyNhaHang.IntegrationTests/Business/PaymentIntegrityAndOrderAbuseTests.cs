using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using Microsoft.Extensions.DependencyInjection;
using QuanLyNhaHang.Domain.Entities;
using QuanLyNhaHang.Infrastructure.Persistence;
using QuanLyNhaHang.IntegrationTests.Infrastructure;
using Xunit;

namespace QuanLyNhaHang.IntegrationTests.Business;

public sealed class PaymentIntegrityAndOrderAbuseTests
{
    [Fact]
    public async Task TakeawayOrder_RejectsQuantityAboveCustomerLimit()
    {
        using var factory = new ApiWebApplicationFactory();
        var menuItemId = await SeedMenuItemAsync(factory);
        using var client = factory.CreateHttpsClient();

        using var response = await client.PostAsJsonAsync(
            "/api/customer-site/takeaway-orders",
            new
            {
                customerName = "Khách giới hạn",
                phoneNumber = "0901000001",
                items = new[]
                {
                    new { menuItemId, quantity = 6 }
                }
            });

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        using var json = await ReadJsonAsync(response);
        Assert.Contains(
            "1 đến 5",
            json.RootElement.GetProperty("message").GetString());
    }

    [Fact]
    public async Task TakeawayOrder_RejectsSecondOpenOrderForSameGuestWithinWindow()
    {
        using var factory = new ApiWebApplicationFactory();
        var menuItemId = await SeedMenuItemAsync(factory);
        using var client = factory.CreateHttpsClient();

        using var firstResponse = await client.PostAsJsonAsync(
            "/api/customer-site/takeaway-orders",
            new
            {
                customerName = "Khách đặt lặp",
                phoneNumber = "0901000002",
                note = "Đơn thứ nhất",
                items = new[]
                {
                    new { menuItemId, quantity = 1 }
                }
            });
        Assert.Equal(HttpStatusCode.OK, firstResponse.StatusCode);

        using var secondResponse = await client.PostAsJsonAsync(
            "/api/customer-site/takeaway-orders",
            new
            {
                customerName = "Khách đặt lặp",
                phoneNumber = "0901000002",
                note = "Đơn thứ hai",
                items = new[]
                {
                    new { menuItemId, quantity = 1 }
                }
            });

        Assert.Equal(HttpStatusCode.BadRequest, secondResponse.StatusCode);
        using var json = await ReadJsonAsync(secondResponse);
        Assert.Contains(
            "đơn mang về chưa hoàn tất",
            json.RootElement.GetProperty("message").GetString());
    }

    [Fact]
    public async Task AdminPaymentMutationEndpoints_AreNotExposed()
    {
        using var factory = new ApiWebApplicationFactory();
        using var client = factory.CreateHttpsClient();
        await AuthenticateAdminAsync(factory, client);

        using var createResponse = await client.PostAsJsonAsync(
            "/api/payments",
            new
            {
                orderId = Guid.NewGuid(),
                paymentMethod = "Cash",
                customerPaid = 100_000m
            });
        Assert.Equal(HttpStatusCode.MethodNotAllowed, createResponse.StatusCode);

        var paymentId = Guid.NewGuid();
        using var updateResponse = await client.PutAsJsonAsync(
            $"/api/payments/{paymentId}",
            new { customerPaid = 100_000m });
        Assert.Equal(HttpStatusCode.MethodNotAllowed, updateResponse.StatusCode);

        using var deleteResponse = await client.DeleteAsync($"/api/payments/{paymentId}");
        Assert.Equal(HttpStatusCode.MethodNotAllowed, deleteResponse.StatusCode);
    }

    private static async Task<Guid> SeedMenuItemAsync(ApiWebApplicationFactory factory)
    {
        using var scope = factory.Services.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        await context.Database.EnsureCreatedAsync();

        var category = new MenuCategory(
            $"Limit category {Guid.NewGuid():N}",
            null,
            1);
        var menuItem = new MenuItem(
            category.Id,
            $"Món giới hạn {Guid.NewGuid():N}",
            null,
            50_000m,
            null);

        context.MenuCategories.Add(category);
        context.MenuItems.Add(menuItem);
        await context.SaveChangesAsync();

        return menuItem.Id;
    }

    private static async Task AuthenticateAdminAsync(
        ApiWebApplicationFactory factory,
        HttpClient client)
    {
        var email = $"payment-readonly-{Guid.NewGuid():N}@example.com";
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

    private static async Task<JsonDocument> ReadJsonAsync(HttpResponseMessage response)
    {
        var content = await response.Content.ReadAsStringAsync();
        return JsonDocument.Parse(content);
    }
}
