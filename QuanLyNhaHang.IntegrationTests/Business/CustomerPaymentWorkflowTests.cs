using System.Net;
using System.Net.Http.Json;
using System.Security.Cryptography;
using System.Text;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using QuanLyNhaHang.Domain.Entities;
using QuanLyNhaHang.Infrastructure.Persistence;
using QuanLyNhaHang.IntegrationTests.Infrastructure;
using Xunit;

namespace QuanLyNhaHang.IntegrationTests.Business;

public sealed class CustomerPaymentWorkflowTests
{
    private const string ChecksumKey =
        "customer-payment-integration-test-checksum-key-0123456789";

    [Fact]
    public async Task ValidPayOsWebhook_RecordsPaymentOnce_AndKeepsKitchenLifecycle()
    {
        using var factory = CreatePayOsFactory();
        using var client = CreateHttpsClient(factory);
        var scenario = await SeedTakeawayOrderAsync(factory);
        var payOsOrderCode = ToPayOsOrderCode(scenario.OrderCode);
        const int expectedAmount = 216_000;
        var signature = SignWebhook(
            expectedAmount,
            payOsOrderCode,
            "plink-test",
            "TEST-REF");

        var payload = new
        {
            success = true,
            data = new
            {
                orderCode = payOsOrderCode,
                amount = expectedAmount,
                code = "00",
                reference = "TEST-REF",
                paymentLinkId = "plink-test"
            },
            signature
        };

        using var firstResponse = await client.PostAsJsonAsync(
            "/api/customer-payments/payos/webhook",
            payload);
        using var duplicateResponse = await client.PostAsJsonAsync(
            "/api/customer-payments/payos/webhook",
            payload);

        Assert.Equal(HttpStatusCode.OK, firstResponse.StatusCode);
        Assert.Equal(HttpStatusCode.OK, duplicateResponse.StatusCode);

        using var scope = factory.Services.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        var payments = await context.Payments
            .AsNoTracking()
            .Where(payment => payment.OrderId == scenario.OrderId)
            .ToListAsync();
        var persistedOrder = await context.Orders
            .AsNoTracking()
            .SingleAsync(order => order.Id == scenario.OrderId);

        var payment = Assert.Single(payments);
        Assert.Equal("Paid", payment.Status);
        Assert.Equal("BankTransfer", payment.PaymentMethod);
        Assert.Equal(200_000m, payment.TotalAmount);
        Assert.Equal(16_000m, payment.VatAmount);
        Assert.Equal(0m, payment.ServiceChargeAmount);
        Assert.Equal(216_000m, payment.FinalAmount);
        Assert.Contains("TEST-REF", payment.Note);

        // Online payment confirms money independently from kitchen/order progress.
        Assert.Equal("Pending", persistedOrder.Status);

        using var statusResponse = await client.GetAsync(
            $"/api/customer-payments/orders/{scenario.OrderId}/status");
        Assert.Equal(HttpStatusCode.OK, statusResponse.StatusCode);
        var status = await statusResponse.Content.ReadFromJsonAsync<PaymentStatusResponse>();
        Assert.NotNull(status);
        Assert.True(status!.Paid);
        Assert.Equal(payment.PaymentCode, status.PaymentCode);
        Assert.Equal(216_000m, status.Amount);
    }

    [Fact]
    public async Task SignedWebhook_WithWrongAmount_IsRejected()
    {
        using var factory = CreatePayOsFactory();
        using var client = CreateHttpsClient(factory);
        var scenario = await SeedTakeawayOrderAsync(factory);
        var payOsOrderCode = ToPayOsOrderCode(scenario.OrderCode);
        const int wrongAmount = 215_000;
        var signature = SignWebhook(
            wrongAmount,
            payOsOrderCode,
            "plink-wrong-amount",
            "WRONG-AMOUNT-REF");

        using var response = await client.PostAsJsonAsync(
            "/api/customer-payments/payos/webhook",
            new
            {
                success = true,
                data = new
                {
                    orderCode = payOsOrderCode,
                    amount = wrongAmount,
                    code = "00",
                    reference = "WRONG-AMOUNT-REF",
                    paymentLinkId = "plink-wrong-amount"
                },
                signature
            });

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);

        using var scope = factory.Services.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        Assert.False(await context.Payments.AnyAsync(
            payment => payment.OrderId == scenario.OrderId));
    }

    private static WebApplicationFactory<Program> CreatePayOsFactory()
    {
        var baseFactory = new ApiWebApplicationFactory();
        return baseFactory.WithWebHostBuilder(builder =>
            builder.ConfigureAppConfiguration((_, configuration) =>
                configuration.AddInMemoryCollection(
                    new Dictionary<string, string?>
                    {
                        ["PayOS:ClientId"] = "test-client-id",
                        ["PayOS:ApiKey"] = "test-api-key",
                        ["PayOS:ChecksumKey"] = ChecksumKey,
                        ["PayOS:CustomerWebBaseUrl"] =
                            "https://customer.example.test"
                    })));
    }

    private static HttpClient CreateHttpsClient(
        WebApplicationFactory<Program> factory)
        => factory.CreateClient(new WebApplicationFactoryClientOptions
        {
            BaseAddress = new Uri("https://localhost"),
            AllowAutoRedirect = false
        });

    private static async Task<PaymentScenario> SeedTakeawayOrderAsync(
        WebApplicationFactory<Program> factory)
    {
        using var scope = factory.Services.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        await context.Database.EnsureCreatedAsync();

        var setting = new RestaurantSetting(
            "Nhà hàng Payment Test",
            "1 Nguyễn Huệ",
            "0900000099",
            null,
            null,
            null,
            null,
            8m,
            5m,
            "VND",
            "08:00",
            "22:00",
            null,
            null);
        var category = new MenuCategory(
            $"Payment category {Guid.NewGuid():N}",
            null,
            1);
        var menuItem = new MenuItem(
            category.Id,
            "Món webhook test",
            null,
            100_000m,
            null);
        var orderCode = $"ORD-{DateTime.UtcNow:yyyyMMddHHmmssfff}";
        var order = Order.CreateTakeaway(
            orderCode,
            "Khách Payment",
            "0900000011",
            null,
            null);
        var orderItem = new OrderItem(
            order.Id,
            menuItem.Id,
            menuItem.Name,
            2,
            menuItem.Price,
            null);
        order.UpdateTotalAmount(orderItem.TotalPrice);

        context.RestaurantSettings.Add(setting);
        context.MenuCategories.Add(category);
        context.MenuItems.Add(menuItem);
        context.Orders.Add(order);
        context.OrderItems.Add(orderItem);
        await context.SaveChangesAsync();

        return new PaymentScenario(order.Id, order.OrderCode);
    }

    private static long ToPayOsOrderCode(string orderCode)
    {
        var digits = new string(orderCode.Where(char.IsDigit).ToArray());
        return checked(long.Parse(digits[^14..]) * 10 + 1);
    }

    private static string SignWebhook(
        int amount,
        long orderCode,
        string paymentLinkId,
        string reference)
    {
        var canonical =
            $"amount={amount}&code=00&orderCode={orderCode}" +
            $"&paymentLinkId={paymentLinkId}&reference={reference}";
        using var hmac = new HMACSHA256(Encoding.UTF8.GetBytes(ChecksumKey));
        return Convert.ToHexString(
                hmac.ComputeHash(Encoding.UTF8.GetBytes(canonical)))
            .ToLowerInvariant();
    }

    private sealed record PaymentScenario(Guid OrderId, string OrderCode);

    private sealed class PaymentStatusResponse
    {
        public bool Paid { get; set; }
        public string? PaymentCode { get; set; }
        public decimal? Amount { get; set; }
    }
}
