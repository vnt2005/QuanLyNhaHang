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
    public async Task ValidPayOsWebhook_RecordsPaymentOnce_AndMarksAttemptPaid()
    {
        using var factory = CreatePayOsFactory();
        using var client = CreateHttpsClient(factory);
        var scenario = await SeedTakeawayOrderWithAttemptAsync(
            factory,
            "plink-test",
            cancelOrder: false);
        const int expectedAmount = 216_000;
        var signature = SignWebhook(
            expectedAmount,
            scenario.ProviderOrderCode,
            "plink-test",
            "TEST-REF");

        var payload = new
        {
            success = true,
            data = new
            {
                orderCode = scenario.ProviderOrderCode,
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
        var persistedAttempt = await context.PaymentAttempts
            .AsNoTracking()
            .SingleAsync(attempt => attempt.Id == scenario.AttemptId);
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

        Assert.Equal(PaymentAttempt.PaidStatus, persistedAttempt.Status);
        Assert.Equal(payment.Id, persistedAttempt.PaymentId);
        Assert.Equal(216_000m, persistedAttempt.ReceivedAmount);
        Assert.Equal("TEST-REF", persistedAttempt.ProviderReference);
        Assert.NotNull(persistedAttempt.PaidAt);

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
        Assert.Equal(PaymentAttempt.PaidStatus, status.AttemptStatus);
        Assert.False(status.RequiresReview);
    }

    [Fact]
    public async Task SignedWebhook_WithWrongAmount_IsAcknowledgedAndRequiresReview()
    {
        using var factory = CreatePayOsFactory();
        using var client = CreateHttpsClient(factory);
        var scenario = await SeedTakeawayOrderWithAttemptAsync(
            factory,
            "plink-wrong-amount",
            cancelOrder: false);
        const int wrongAmount = 215_000;
        var signature = SignWebhook(
            wrongAmount,
            scenario.ProviderOrderCode,
            "plink-wrong-amount",
            "WRONG-AMOUNT-REF");

        using var response = await client.PostAsJsonAsync(
            "/api/customer-payments/payos/webhook",
            new
            {
                success = true,
                data = new
                {
                    orderCode = scenario.ProviderOrderCode,
                    amount = wrongAmount,
                    code = "00",
                    reference = "WRONG-AMOUNT-REF",
                    paymentLinkId = "plink-wrong-amount"
                },
                signature
            });

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        using var scope = factory.Services.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        Assert.False(await context.Payments.AnyAsync(
            payment => payment.OrderId == scenario.OrderId));

        var attempt = await context.PaymentAttempts
            .AsNoTracking()
            .SingleAsync(item => item.Id == scenario.AttemptId);
        Assert.Equal(PaymentAttempt.RequiresReviewStatus, attempt.Status);
        Assert.Equal("AmountMismatch", attempt.ReviewReason);
        Assert.Equal(215_000m, attempt.ReceivedAmount);
        Assert.Equal("WRONG-AMOUNT-REF", attempt.ProviderReference);
    }

    [Fact]
    public async Task ValidWebhook_AfterOrderCancellation_IsHeldForReviewWithoutPayment()
    {
        using var factory = CreatePayOsFactory();
        using var client = CreateHttpsClient(factory);
        var scenario = await SeedTakeawayOrderWithAttemptAsync(
            factory,
            "plink-late-payment",
            cancelOrder: true);
        const int expectedAmount = 216_000;
        var signature = SignWebhook(
            expectedAmount,
            scenario.ProviderOrderCode,
            "plink-late-payment",
            "LATE-PAYMENT-REF");

        using var response = await client.PostAsJsonAsync(
            "/api/customer-payments/payos/webhook",
            new
            {
                success = true,
                data = new
                {
                    orderCode = scenario.ProviderOrderCode,
                    amount = expectedAmount,
                    code = "00",
                    reference = "LATE-PAYMENT-REF",
                    paymentLinkId = "plink-late-payment"
                },
                signature
            });

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        using var scope = factory.Services.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        Assert.False(await context.Payments.AnyAsync(
            payment => payment.OrderId == scenario.OrderId));

        var attempt = await context.PaymentAttempts
            .AsNoTracking()
            .SingleAsync(item => item.Id == scenario.AttemptId);
        Assert.Equal(PaymentAttempt.RequiresReviewStatus, attempt.Status);
        Assert.Equal("PaidAfterOrderCancellation", attempt.ReviewReason);
        Assert.Equal((decimal)expectedAmount, attempt.ReceivedAmount);
        Assert.Equal("LATE-PAYMENT-REF", attempt.ProviderReference);

        using var statusResponse = await client.GetAsync(
            $"/api/customer-payments/orders/{scenario.OrderId}/status");
        Assert.Equal(HttpStatusCode.OK, statusResponse.StatusCode);
        var status = await statusResponse.Content.ReadFromJsonAsync<PaymentStatusResponse>();
        Assert.NotNull(status);
        Assert.False(status!.Paid);
        Assert.True(status.RequiresReview);
        Assert.Equal(PaymentAttempt.RequiresReviewStatus, status.AttemptStatus);
        Assert.Equal((decimal)expectedAmount, status.ReceivedAmount);
    }

    [Fact]
    public async Task ValidWebhook_AfterPaymentAttemptWasCancelled_IsHeldForReview()
    {
        using var factory = CreatePayOsFactory();
        using var client = CreateHttpsClient(factory);
        var scenario = await SeedTakeawayOrderWithAttemptAsync(
            factory,
            "plink-cancelled-attempt",
            cancelOrder: false);

        using (var scope = factory.Services.CreateScope())
        {
            var context = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
            var attempt = await context.PaymentAttempts
                .SingleAsync(item => item.Id == scenario.AttemptId);
            attempt.MarkCancelled("Test cancellation before late webhook.");
            await context.SaveChangesAsync();
        }

        const int expectedAmount = 216_000;
        var signature = SignWebhook(
            expectedAmount,
            scenario.ProviderOrderCode,
            "plink-cancelled-attempt",
            "CANCELLED-LATE-REF");

        using var response = await client.PostAsJsonAsync(
            "/api/customer-payments/payos/webhook",
            new
            {
                success = true,
                data = new
                {
                    orderCode = scenario.ProviderOrderCode,
                    amount = expectedAmount,
                    code = "00",
                    reference = "CANCELLED-LATE-REF",
                    paymentLinkId = "plink-cancelled-attempt"
                },
                signature
            });

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        using var verifyScope = factory.Services.CreateScope();
        var verifyContext = verifyScope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        Assert.False(await verifyContext.Payments.AnyAsync(
            payment => payment.OrderId == scenario.OrderId));
        var persistedAttempt = await verifyContext.PaymentAttempts
            .AsNoTracking()
            .SingleAsync(item => item.Id == scenario.AttemptId);
        Assert.Equal(PaymentAttempt.RequiresReviewStatus, persistedAttempt.Status);
        Assert.Equal("PaidAfterPaymentCancellation", persistedAttempt.ReviewReason);
        Assert.Equal((decimal)expectedAmount, persistedAttempt.ReceivedAmount);
    }

    [Fact]
    public async Task Webhook_WithDifferentPaymentLinkId_IsHeldForReview()
    {
        using var factory = CreatePayOsFactory();
        using var client = CreateHttpsClient(factory);
        var scenario = await SeedTakeawayOrderWithAttemptAsync(
            factory,
            "plink-original",
            cancelOrder: false);
        const int expectedAmount = 216_000;
        var signature = SignWebhook(
            expectedAmount,
            scenario.ProviderOrderCode,
            "plink-other",
            "MISMATCH-LINK-REF");

        using var response = await client.PostAsJsonAsync(
            "/api/customer-payments/payos/webhook",
            new
            {
                success = true,
                data = new
                {
                    orderCode = scenario.ProviderOrderCode,
                    amount = expectedAmount,
                    code = "00",
                    reference = "MISMATCH-LINK-REF",
                    paymentLinkId = "plink-other"
                },
                signature
            });

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        using var scope = factory.Services.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        Assert.False(await context.Payments.AnyAsync(
            payment => payment.OrderId == scenario.OrderId));
        var attempt = await context.PaymentAttempts
            .AsNoTracking()
            .SingleAsync(item => item.Id == scenario.AttemptId);
        Assert.Equal(PaymentAttempt.RequiresReviewStatus, attempt.Status);
        Assert.Equal("ProviderPaymentLinkIdMismatch", attempt.ReviewReason);
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

    private static async Task<PaymentScenario> SeedTakeawayOrderWithAttemptAsync(
        WebApplicationFactory<Program> factory,
        string paymentLinkId,
        bool cancelOrder)
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

        if (cancelOrder)
            order.Cancel();

        var providerOrderCode = CreateProviderOrderCode();
        var paymentAttempt = new PaymentAttempt(
            order.Id,
            "payOS",
            providerOrderCode,
            216_000m,
            DateTime.UtcNow.AddMinutes(15));
        paymentAttempt.AttachPaymentLink(
            paymentLinkId,
            $"https://pay.example.test/{paymentLinkId}",
            "PENDING");

        context.RestaurantSettings.Add(setting);
        context.MenuCategories.Add(category);
        context.MenuItems.Add(menuItem);
        context.Orders.Add(order);
        context.OrderItems.Add(orderItem);
        context.PaymentAttempts.Add(paymentAttempt);
        await context.SaveChangesAsync();

        return new PaymentScenario(
            order.Id,
            order.OrderCode,
            paymentAttempt.Id,
            providerOrderCode);
    }

    private static long CreateProviderOrderCode()
        => checked(
            DateTimeOffset.UtcNow.ToUnixTimeMilliseconds() * 1000L +
            Random.Shared.Next(100, 1000));

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

    private sealed record PaymentScenario(
        Guid OrderId,
        string OrderCode,
        Guid AttemptId,
        long ProviderOrderCode);

    private sealed class PaymentStatusResponse
    {
        public bool Paid { get; set; }
        public string? PaymentCode { get; set; }
        public decimal? Amount { get; set; }
        public string? AttemptStatus { get; set; }
        public bool RequiresReview { get; set; }
        public decimal? ReceivedAmount { get; set; }
    }
}
