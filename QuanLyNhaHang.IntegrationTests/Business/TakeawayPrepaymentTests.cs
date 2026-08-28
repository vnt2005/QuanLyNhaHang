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

public sealed class TakeawayPrepaymentTests
{
    [Fact]
    public async Task TakeawayOrder_CanStartCookingBeforePaymentIsRecorded()
    {
        using var factory = new ApiWebApplicationFactory();
        using var client = factory.CreateHttpsClient();
        await AuthenticateAdminAsync(factory, client);

        var orderId = await SeedPendingTakeawayAsync(factory);

        using var response = await ChangeOrderStatusAsync(
            client,
            orderId,
            "Cooking");

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        using var verificationScope = factory.Services.CreateScope();
        var verificationContext = verificationScope.ServiceProvider
            .GetRequiredService<ApplicationDbContext>();
        var updatedOrder = await verificationContext.Orders
            .AsNoTracking()
            .SingleAsync(x => x.Id == orderId);
        var updatedItems = await verificationContext.OrderItems
            .AsNoTracking()
            .Where(x => x.OrderId == orderId)
            .ToListAsync();
        var hasPaidPayment = await verificationContext.Payments
            .AsNoTracking()
            .AnyAsync(x => x.OrderId == orderId && x.Status == "Paid");

        Assert.Equal("Cooking", updatedOrder.Status);
        Assert.All(updatedItems, item => Assert.Equal("Cooking", item.Status));
        Assert.False(hasPaidPayment);
    }

    private static async Task<Guid> SeedPendingTakeawayAsync(
        ApiWebApplicationFactory factory)
    {
        using var scope = factory.Services.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        await context.Database.EnsureCreatedAsync();

        var category = new MenuCategory(
            $"Cook-before-pay category {Guid.NewGuid():N}",
            null,
            1);
        var menuItem = new MenuItem(
            category.Id,
            "Món nấu trước thanh toán sau",
            null,
            90_000m,
            null);
        var order = Order.CreateTakeaway(
            $"ORD-{Guid.NewGuid():N}",
            "Khách thanh toán sau",
            "0901000005",
            null,
            null);
        var orderItem = new OrderItem(
            order.Id,
            menuItem.Id,
            menuItem.Name,
            1,
            menuItem.Price,
            null);

        order.UpdateTotalAmount(orderItem.TotalPrice);

        context.MenuCategories.Add(category);
        context.MenuItems.Add(menuItem);
        context.Orders.Add(order);
        context.OrderItems.Add(orderItem);
        await context.SaveChangesAsync();

        return order.Id;
    }

    private static async Task AuthenticateAdminAsync(
        ApiWebApplicationFactory factory,
        HttpClient client)
    {
        var email = $"takeaway-pay-later-{Guid.NewGuid():N}@example.com";
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

    private static Task<HttpResponseMessage> ChangeOrderStatusAsync(
        HttpClient client,
        Guid orderId,
        string status)
    {
        return client.PatchAsJsonAsync(
            $"/api/orders/{orderId}/status",
            new
            {
                id = orderId,
                status
            });
    }

    private static async Task<JsonDocument> ReadJsonAsync(
        HttpResponseMessage response)
    {
        var content = await response.Content.ReadAsStringAsync();
        return JsonDocument.Parse(content);
    }
}
