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
    public async Task AdminPayments_IsReadOnly_AndListsOnlyVerifiedSePayPayments()
    {
        using var factory = new ApiWebApplicationFactory();
        using var client = factory.CreateHttpsClient();
        await AuthenticateAdminAsync(factory, client);

        var verifiedPaymentId = await SeedVerifiedSePayPaymentAsync(factory);
        var manualPaymentId = await SeedUnverifiedCashPaymentAsync(factory);

        using var listResponse = await client.GetAsync("/api/payments/paginated?pageNumber=1&pageSize=20");
        Assert.Equal(HttpStatusCode.OK, listResponse.StatusCode);

        using var listJson = await ReadJsonAsync(listResponse);
        var items = listJson.RootElement.GetProperty("items").EnumerateArray().ToArray();

        Assert.Single(items);
        Assert.Equal(verifiedPaymentId, items[0].GetProperty("id").GetGuid());
        Assert.Equal("BankTransfer", items[0].GetProperty("paymentMethod").GetString());
        Assert.Equal("Paid", items[0].GetProperty("status").GetString());
        Assert.DoesNotContain(items, item => item.GetProperty("id").GetGuid() == manualPaymentId);

        using var createResponse = await client.PostAsJsonAsync(
            "/api/payments",
            new
            {
                orderId = Guid.NewGuid(),
                customerPaid = 100_000m,
                paymentMethod = "Cash"
            });
        Assert.Equal(HttpStatusCode.MethodNotAllowed, createResponse.StatusCode);

        using var updateResponse = await client.PutAsJsonAsync(
            $"/api/payments/{verifiedPaymentId}",
            new { customerPaid = 1m });
        Assert.Equal(HttpStatusCode.MethodNotAllowed, updateResponse.StatusCode);

        using var deleteResponse = await client.DeleteAsync($"/api/payments/{verifiedPaymentId}");
        Assert.Equal(HttpStatusCode.MethodNotAllowed, deleteResponse.StatusCode);
    }

    private static async Task<Guid> SeedVerifiedSePayPaymentAsync(ApiWebApplicationFactory factory)
    {
        using var scope = factory.Services.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        await context.Database.EnsureCreatedAsync();

        var order = Order.CreateTakeaway(
            $"ORD-{Guid.NewGuid():N}",
            "Khách SePay",
            $"09{Random.Shared.Next(10_000_000, 99_999_999)}",
            null,
            null);
        order.UpdateTotalAmount(100_000m);

        var attempt = new PaymentAttempt(
            order.Id,
            "SePay",
            Random.Shared.NextInt64(1, long.MaxValue),
            100_000m,
            DateTime.UtcNow.AddMinutes(10));
        attempt.AttachPaymentRequest(
            $"test-{Guid.NewGuid():N}",
            "https://pay.sepay.vn/test",
            "PENDING");

        var providerReference = $"txn-{Guid.NewGuid():N}";
        var payment = new Payment(
            order.Id,
            100_000m,
            0m,
            0m,
            100_000m,
            "BankTransfer",
            $"SePay | transactionId=verified-test | reference={providerReference} | gateway=TEST | attempt={attempt.Id}",
            0m);

        attempt.MarkPaid(payment.Id, 100_000m, providerReference);

        context.Orders.Add(order);
        context.Payments.Add(payment);
        context.PaymentAttempts.Add(attempt);
        await context.SaveChangesAsync();

        return payment.Id;
    }

    private static async Task<Guid> SeedUnverifiedCashPaymentAsync(ApiWebApplicationFactory factory)
    {
        using var scope = factory.Services.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();

        var order = Order.CreateTakeaway(
            $"ORD-{Guid.NewGuid():N}",
            "Khách dữ liệu cũ",
            $"09{Random.Shared.Next(10_000_000, 99_999_999)}",
            null,
            null);
        order.UpdateTotalAmount(50_000m);

        var payment = new Payment(
            order.Id,
            50_000m,
            0m,
            0m,
            50_000m,
            "Cash",
            "Dữ liệu thanh toán thủ công cũ",
            0m);

        context.Orders.Add(order);
        context.Payments.Add(payment);
        await context.SaveChangesAsync();

        return payment.Id;
    }

    private static async Task AuthenticateAdminAsync(
        ApiWebApplicationFactory factory,
        HttpClient client)
    {
        var email = $"payment-read-only-{Guid.NewGuid():N}@example.com";
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
