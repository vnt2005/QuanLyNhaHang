using System.Net;
using System.Text;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using QuanLyNhaHang.Domain.Entities;
using QuanLyNhaHang.Infrastructure.Persistence;
using QuanLyNhaHang.IntegrationTests.Infrastructure;
using Xunit;

namespace QuanLyNhaHang.IntegrationTests.Business;

public sealed class RequestProtectionWorkflowTests
{
    [Fact]
    public async Task SameIdempotencyKey_ReplaysResponse_AndCreatesOneOrder()
    {
        using var factory = new ApiWebApplicationFactory();
        var menuItemId = await SeedMenuItemAsync(factory);
        using var client = factory.CreateHttpsClient();
        var payload = CreatePayload(menuItemId, "0901234567");
        const string clientId = "request-protection-client-01";
        const string idempotencyKey = "takeaway-submit-00000001";

        using var first = await SendTakeawayAsync(
            client,
            payload,
            clientId,
            idempotencyKey);
        using var second = await SendTakeawayAsync(
            client,
            payload,
            clientId,
            idempotencyKey);

        Assert.Equal(HttpStatusCode.OK, first.StatusCode);
        Assert.Equal(HttpStatusCode.OK, second.StatusCode);
        Assert.True(second.Headers.TryGetValues(
            "Idempotency-Replayed",
            out var replayedValues));
        Assert.Equal("true", Assert.Single(replayedValues));
        Assert.Equal(
            await first.Content.ReadAsStringAsync(),
            await second.Content.ReadAsStringAsync());

        using var scope = factory.Services.CreateScope();
        var context = scope.ServiceProvider
            .GetRequiredService<ApplicationDbContext>();
        Assert.Equal(1, await context.Orders.CountAsync());
        Assert.Equal(1, await context.IdempotencyRecords.CountAsync());
    }

    [Fact]
    public async Task SameIdempotencyKey_WithDifferentBody_ReturnsConflict()
    {
        using var factory = new ApiWebApplicationFactory();
        var menuItemId = await SeedMenuItemAsync(factory);
        using var client = factory.CreateHttpsClient();
        const string clientId = "request-protection-client-02";
        const string idempotencyKey = "takeaway-submit-00000002";

        using var first = await SendTakeawayAsync(
            client,
            CreatePayload(menuItemId, "0901234567"),
            clientId,
            idempotencyKey);
        using var conflict = await SendTakeawayAsync(
            client,
            CreatePayload(menuItemId, "0907654321"),
            clientId,
            idempotencyKey);

        Assert.Equal(HttpStatusCode.OK, first.StatusCode);
        Assert.Equal(HttpStatusCode.Conflict, conflict.StatusCode);
        var problem = await conflict.Content.ReadAsStringAsync();
        Assert.Contains("Idempotency-Key", problem);

        using var scope = factory.Services.CreateScope();
        var context = scope.ServiceProvider
            .GetRequiredService<ApplicationDbContext>();
        Assert.Equal(1, await context.Orders.CountAsync());
    }

    [Fact]
    public async Task AnonymousTakeaway_SeventhRequestInOneMinute_IsRateLimited()
    {
        using var factory = new ApiWebApplicationFactory();
        var menuItemId = await SeedMenuItemAsync(factory);
        using var client = factory.CreateHttpsClient();
        const string clientId = "request-protection-rate-client";

        for (var requestNumber = 1; requestNumber <= 6; requestNumber++)
        {
            using var accepted = await SendTakeawayAsync(
                client,
                CreatePayload(
                    menuItemId,
                    $"09000000{requestNumber:00}"),
                clientId,
                $"rate-limit-order-{requestNumber:00000000}");

            Assert.Equal(HttpStatusCode.OK, accepted.StatusCode);
        }

        using var rejected = await SendTakeawayAsync(
            client,
            CreatePayload(menuItemId, "0900000007"),
            clientId,
            "rate-limit-order-00000007");

        Assert.Equal(HttpStatusCode.TooManyRequests, rejected.StatusCode);
        Assert.True(rejected.Headers.Contains("Retry-After"));
        var problem = await rejected.Content.ReadAsStringAsync();
        Assert.Contains("retryAfterSeconds", problem);
    }

    private static string CreatePayload(
        Guid menuItemId,
        string phoneNumber)
    {
        return JsonSerializer.Serialize(new
        {
            customerName = "Khách chống spam",
            phoneNumber,
            note = "Kiểm thử request protection",
            items = new[]
            {
                new { menuItemId, quantity = 1 }
            }
        });
    }

    private static async Task<HttpResponseMessage> SendTakeawayAsync(
        HttpClient client,
        string payload,
        string clientId,
        string idempotencyKey)
    {
        using var request = new HttpRequestMessage(
            HttpMethod.Post,
            "/api/customer-site/takeaway-orders");
        request.Headers.Add("X-Client-Id", clientId);
        request.Headers.Add("Idempotency-Key", idempotencyKey);
        request.Content = new StringContent(
            payload,
            Encoding.UTF8,
            "application/json");

        return await client.SendAsync(request);
    }

    private static async Task<Guid> SeedMenuItemAsync(
        ApiWebApplicationFactory factory)
    {
        using var scope = factory.Services.CreateScope();
        var context = scope.ServiceProvider
            .GetRequiredService<ApplicationDbContext>();
        await context.Database.EnsureCreatedAsync();

        var category = new MenuCategory(
            "Món kiểm thử chống spam",
            null,
            1);
        var menuItem = new MenuItem(
            category.Id,
            "Cơm kiểm thử chống spam",
            null,
            75_000m,
            null);

        context.MenuCategories.Add(category);
        context.MenuItems.Add(menuItem);
        await context.SaveChangesAsync();
        return menuItem.Id;
    }
}
