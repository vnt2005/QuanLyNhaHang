using System.Net;
using System.Net.Http.Json;
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
    private const string WebhookApiKey =
        "customer-payment-integration-test-webhook-key-0123456789";
    private const string AccountNumber = "1234567890";
    private const string AccountHolder = "VO NGUYEN THANH";

    [Fact]
    public async Task CreateSePayQr_ReusesPendingAttemptAndReturnsHdbankInstruction()
    {
        using var factory = CreateSePayFactory();
        using var client = CreateHttpsClient(factory);
        var scenario = await SeedTakeawayOrderWithAttemptAsync(factory, cancelOrder: false);

        using var response = await client.PostAsJsonAsync(
            $"/api/customer-payments/orders/{scenario.OrderId}/sepay-qr",
            new { qrToken = (string?)null });

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);
        var result = await response.Content.ReadFromJsonAsync<PaymentInstructionResponse>();
        Assert.NotNull(result);
        Assert.False(result!.AlreadyPaid);
        Assert.True(result.Reused);
        Assert.Equal(scenario.AttemptId, result.AttemptId);
        Assert.Equal("HDBank", result.BankCode);
        Assert.Equal(AccountNumber, result.AccountNumber);
        Assert.Equal(AccountHolder, result.AccountHolder);
        Assert.Equal(scenario.PaymentCode, result.TransferContent);
        Assert.Equal(216_000m, result.Amount);
        Assert.Contains("vietqr.app/img", result.QrCode);
        Assert.Contains($"des={scenario.PaymentCode}", result.QrCode);
    }

    [Fact]
    public async Task ValidSePayWebhook_RecordsPaymentOnce_AndMarksAttemptPaid()
    {
        using var factory = CreateSePayFactory();
        using var client = CreateHttpsClient(factory);
        var scenario = await SeedTakeawayOrderWithAttemptAsync(factory, cancelOrder: false);
        const decimal expectedAmount = 216_000m;
        const long transactionId = 9_270_401;
        var payload = CreateWebhookPayload(
            scenario.PaymentCode,
            expectedAmount,
            transactionId,
            AccountNumber,
            "HDB-TEST-REF");

        using var firstResponse = await PostSePayWebhookAsync(client, payload);
        using var duplicateResponse = await PostSePayWebhookAsync(client, payload);

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
        Assert.Contains("HDB-TEST-REF", payment.Note);
        Assert.Contains(transactionId.ToString(), payment.Note);

        Assert.Equal(PaymentAttempt.PaidStatus, persistedAttempt.Status);
        Assert.Equal(payment.Id, persistedAttempt.PaymentId);
        Assert.Equal(216_000m, persistedAttempt.ReceivedAmount);
        Assert.Equal(transactionId.ToString(), persistedAttempt.ProviderReference);
        Assert.NotNull(persistedAttempt.PaidAt);

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
    public async Task SePayWebhook_WithoutApiKey_IsUnauthorized()
    {
        using var factory = CreateSePayFactory();
        using var client = CreateHttpsClient(factory);
        var scenario = await SeedTakeawayOrderWithAttemptAsync(factory, cancelOrder: false);
        var payload = CreateWebhookPayload(
            scenario.PaymentCode,
            216_000m,
            9_270_402,
            AccountNumber,
            "NO-AUTH-REF");

        using var response = await PostSePayWebhookAsync(client, payload, authorize: false);
        Assert.Equal(HttpStatusCode.Unauthorized, response.StatusCode);

        using var scope = factory.Services.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        Assert.False(await context.Payments.AnyAsync(payment => payment.OrderId == scenario.OrderId));
    }

    [Fact]
    public async Task SePayWebhook_WithWrongAmount_IsAcknowledgedAndRequiresReview()
    {
        using var factory = CreateSePayFactory();
        using var client = CreateHttpsClient(factory);
        var scenario = await SeedTakeawayOrderWithAttemptAsync(factory, cancelOrder: false);
        const decimal wrongAmount = 215_000m;
        const long transactionId = 9_270_403;

        using var response = await PostSePayWebhookAsync(
            client,
            CreateWebhookPayload(
                scenario.PaymentCode,
                wrongAmount,
                transactionId,
                AccountNumber,
                "WRONG-AMOUNT-REF"));

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        using var scope = factory.Services.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        Assert.False(await context.Payments.AnyAsync(payment => payment.OrderId == scenario.OrderId));

        var attempt = await context.PaymentAttempts
            .AsNoTracking()
            .SingleAsync(item => item.Id == scenario.AttemptId);
        Assert.Equal(PaymentAttempt.RequiresReviewStatus, attempt.Status);
        Assert.Equal("AmountMismatch", attempt.ReviewReason);
        Assert.Equal(215_000m, attempt.ReceivedAmount);
        Assert.Equal(transactionId.ToString(), attempt.ProviderReference);
    }

    [Fact]
    public async Task ValidWebhook_AfterOrderCancellation_IsHeldForReviewWithoutPayment()
    {
        using var factory = CreateSePayFactory();
        using var client = CreateHttpsClient(factory);
        var scenario = await SeedTakeawayOrderWithAttemptAsync(factory, cancelOrder: true);
        const long transactionId = 9_270_404;

        using var response = await PostSePayWebhookAsync(
            client,
            CreateWebhookPayload(
                scenario.PaymentCode,
                216_000m,
                transactionId,
                AccountNumber,
                "LATE-PAYMENT-REF"));

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        using var scope = factory.Services.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        Assert.False(await context.Payments.AnyAsync(payment => payment.OrderId == scenario.OrderId));

        var attempt = await context.PaymentAttempts
            .AsNoTracking()
            .SingleAsync(item => item.Id == scenario.AttemptId);
        Assert.Equal(PaymentAttempt.RequiresReviewStatus, attempt.Status);
        Assert.Equal("PaidAfterOrderCancellation", attempt.ReviewReason);
        Assert.Equal(216_000m, attempt.ReceivedAmount);
    }

    [Fact]
    public async Task ValidWebhook_AfterPaymentAttemptWasCancelled_IsHeldForReview()
    {
        using var factory = CreateSePayFactory();
        using var client = CreateHttpsClient(factory);
        var scenario = await SeedTakeawayOrderWithAttemptAsync(factory, cancelOrder: false);

        using (var scope = factory.Services.CreateScope())
        {
            var context = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
            var attempt = await context.PaymentAttempts
                .SingleAsync(item => item.Id == scenario.AttemptId);
            attempt.MarkCancelled("Test cancellation before late webhook.");
            await context.SaveChangesAsync();
        }

        using var response = await PostSePayWebhookAsync(
            client,
            CreateWebhookPayload(
                scenario.PaymentCode,
                216_000m,
                9_270_405,
                AccountNumber,
                "CANCELLED-LATE-REF"));

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        using var verifyScope = factory.Services.CreateScope();
        var verifyContext = verifyScope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        Assert.False(await verifyContext.Payments.AnyAsync(payment => payment.OrderId == scenario.OrderId));
        var persistedAttempt = await verifyContext.PaymentAttempts
            .AsNoTracking()
            .SingleAsync(item => item.Id == scenario.AttemptId);
        Assert.Equal(PaymentAttempt.RequiresReviewStatus, persistedAttempt.Status);
        Assert.Equal("PaidAfterPaymentCancellation", persistedAttempt.ReviewReason);
        Assert.Equal(216_000m, persistedAttempt.ReceivedAmount);
    }

    [Fact]
    public async Task Webhook_ForDifferentBankAccount_IsIgnored()
    {
        using var factory = CreateSePayFactory();
        using var client = CreateHttpsClient(factory);
        var scenario = await SeedTakeawayOrderWithAttemptAsync(factory, cancelOrder: false);

        using var response = await PostSePayWebhookAsync(
            client,
            CreateWebhookPayload(
                scenario.PaymentCode,
                216_000m,
                9_270_406,
                "9999999999",
                "OTHER-ACCOUNT-REF"));

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        using var scope = factory.Services.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        Assert.False(await context.Payments.AnyAsync(payment => payment.OrderId == scenario.OrderId));
        var attempt = await context.PaymentAttempts
            .AsNoTracking()
            .SingleAsync(item => item.Id == scenario.AttemptId);
        Assert.Equal(PaymentAttempt.PendingStatus, attempt.Status);
    }

    private static WebApplicationFactory<Program> CreateSePayFactory()
    {
        var baseFactory = new ApiWebApplicationFactory();
        return baseFactory.WithWebHostBuilder(builder =>
            builder.ConfigureAppConfiguration((_, configuration) =>
                configuration.AddInMemoryCollection(
                    new Dictionary<string, string?>
                    {
                        ["SePay:BankCode"] = "HDBank",
                        ["SePay:AccountNumber"] = AccountNumber,
                        ["SePay:AccountHolder"] = AccountHolder,
                        ["SePay:WebhookApiKey"] = WebhookApiKey,
                        ["SePay:PaymentPrefix"] = "DH"
                    })));
    }

    private static HttpClient CreateHttpsClient(WebApplicationFactory<Program> factory)
        => factory.CreateClient(new WebApplicationFactoryClientOptions
        {
            BaseAddress = new Uri("https://localhost"),
            AllowAutoRedirect = false
        });

    private static async Task<HttpResponseMessage> PostSePayWebhookAsync(
        HttpClient client,
        object payload,
        bool authorize = true)
    {
        using var request = new HttpRequestMessage(HttpMethod.Post, "/api/customer-payments/sepay/webhook")
        {
            Content = JsonContent.Create(payload)
        };

        if (authorize)
            request.Headers.TryAddWithoutValidation("Authorization", $"Apikey {WebhookApiKey}");

        return await client.SendAsync(request);
    }

    private static object CreateWebhookPayload(
        string paymentCode,
        decimal amount,
        long transactionId,
        string accountNumber,
        string referenceCode)
        => new
        {
            id = transactionId,
            gateway = "HDBank",
            transactionDate = "2026-08-18 01:30:00",
            accountNumber,
            subAccount = "",
            code = paymentCode,
            content = $"{paymentCode} thanh toan don hang",
            transferType = "in",
            description = $"Khach hang chuyen tien {paymentCode}",
            transferAmount = amount,
            accumulated = 1_000_000m,
            referenceCode
        };

    private static async Task<PaymentScenario> SeedTakeawayOrderWithAttemptAsync(
        WebApplicationFactory<Program> factory,
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

        var providerOrderCode = Random.Shared.Next(1_000_000, 10_000_000);
        var paymentCode = $"DH{providerOrderCode:D7}";
        var paymentAttempt = new PaymentAttempt(
            order.Id,
            "SePay",
            providerOrderCode,
            216_000m,
            DateTime.UtcNow.AddMinutes(15));
        paymentAttempt.AttachPaymentRequest(
            paymentCode,
            $"https://vietqr.app/img?acc={AccountNumber}&bank=HDBank&amount=216000&des={paymentCode}",
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
            providerOrderCode,
            paymentCode);
    }

    private sealed record PaymentScenario(
        Guid OrderId,
        string OrderCode,
        Guid AttemptId,
        long ProviderOrderCode,
        string PaymentCode);

    private sealed class PaymentInstructionResponse
    {
        public bool AlreadyPaid { get; set; }
        public bool Reused { get; set; }
        public Guid? AttemptId { get; set; }
        public string? BankCode { get; set; }
        public string? AccountNumber { get; set; }
        public string? AccountHolder { get; set; }
        public string? TransferContent { get; set; }
        public decimal Amount { get; set; }
        public string QrCode { get; set; } = string.Empty;
    }

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
