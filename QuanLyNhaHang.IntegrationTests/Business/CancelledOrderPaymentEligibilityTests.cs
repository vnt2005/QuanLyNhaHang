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

public sealed class CancelledOrderPaymentEligibilityTests
{
    [Fact]
    public async Task CancelledOrder_IsNotOfferedAtCounter_AndCannotBePaidByDirectApiCall()
    {
        using var factory = new ApiWebApplicationFactory();
        using var client = factory.CreateHttpsClient();
        await AuthenticateAdminAsync(factory, client);

        var eligibleOrderId = await SeedServedTakeawayAsync(factory, "Khách hợp lệ");
        var cancelledOrderId = await SeedServedTakeawayAsync(factory, "Khách đã hủy");

        using (var scope = factory.Services.CreateScope())
        {
            var context = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
            var cancelledOrder = await context.Orders
                .SingleAsync(order => order.Id == cancelledOrderId);
            cancelledOrder.Cancel();
            await context.SaveChangesAsync();
        }

        using var listResponse = await client.GetAsync(
            "/api/payments/eligible-counter-orders");
        Assert.Equal(HttpStatusCode.OK, listResponse.StatusCode);

        using var listJson = await ReadJsonAsync(listResponse);
        var listedOrderIds = listJson.RootElement
            .EnumerateArray()
            .Select(item => item.GetProperty("id").GetGuid())
            .ToArray();

        Assert.Contains(eligibleOrderId, listedOrderIds);
        Assert.DoesNotContain(cancelledOrderId, listedOrderIds);

        using var paymentResponse = await client.PostAsJsonAsync(
            "/api/payments",
            new
            {
                orderId = cancelledOrderId,
                discountAmount = 0m,
                serviceChargeAmount = 0m,
                vatAmount = 0m,
                customerPaid = 100_000m,
                paymentMethod = "Cash",
                note = "Cố tình thu tiền cho đơn đã hủy",
                issueInvoice = true
            });

        Assert.Equal(HttpStatusCode.BadRequest, paymentResponse.StatusCode);
        using var paymentJson = await ReadJsonAsync(paymentResponse);
        Assert.Contains(
            "đã hủy",
            paymentJson.RootElement.GetProperty("message").GetString());

        using var verificationScope = factory.Services.CreateScope();
        var verificationContext = verificationScope.ServiceProvider
            .GetRequiredService<ApplicationDbContext>();
        Assert.False(await verificationContext.Payments
            .AnyAsync(payment => payment.OrderId == cancelledOrderId));
    }

    private static async Task<Guid> SeedServedTakeawayAsync(
        ApiWebApplicationFactory factory,
        string customerName)
    {
        using var scope = factory.Services.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        await context.Database.EnsureCreatedAsync();

        var category = new MenuCategory(
            $"Counter eligibility {Guid.NewGuid():N}",
            null,
            1);
        var menuItem = new MenuItem(
            category.Id,
            $"Món test {Guid.NewGuid():N}",
            null,
            100_000m,
            null);
        var order = Order.CreateTakeaway(
            $"ORD-{Guid.NewGuid():N}",
            customerName,
            $"09{Random.Shared.Next(10_000_000, 99_999_999)}",
            null,
            null);
        var orderItem = new OrderItem(
            order.Id,
            menuItem.Id,
            menuItem.Name,
            1,
            menuItem.Price,
            null);

        orderItem.MarkCooking();
        orderItem.MarkReady();
        orderItem.MarkServed();
        order.UpdateTotalAmount(orderItem.TotalPrice);
        order.MarkServed();

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
        var email = $"cancelled-payment-{Guid.NewGuid():N}@example.com";
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

    private static async Task<JsonDocument> ReadJsonAsync(
        HttpResponseMessage response)
    {
        var content = await response.Content.ReadAsStringAsync();
        return JsonDocument.Parse(content);
    }
}
