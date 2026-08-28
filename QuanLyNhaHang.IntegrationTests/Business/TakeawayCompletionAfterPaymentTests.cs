using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
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

public sealed class TakeawayCompletionAfterPaymentTests
{
    private const string WebhookApiKey =
        "takeaway-completion-webhook-key-0123456789";
    private const string AccountNumber = "1234567890";
    private const string AccountHolder = "VO NGUYEN THANH";

    [Fact]
    public async Task ReadyTakeaway_WhenPaymentSucceeds_IsCompletedImmediately()
    {
        using var factory = CreateSePayFactory();
        using var client = factory.CreateClient(new WebApplicationFactoryClientOptions
        {
            BaseAddress = new Uri("https://localhost"),
            AllowAutoRedirect = false
        });

        Guid orderId;
        Guid orderItemId;
        string paymentCode;

        using (var scope = factory.Services.CreateScope())
        {
            var context = scope.ServiceProvider
                .GetRequiredService<ApplicationDbContext>();
            await context.Database.EnsureCreatedAsync();

            var setting = new RestaurantSetting(
                "Nhà hàng Takeaway Completion Test",
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
                $"Takeaway completion category {Guid.NewGuid():N}",
                null,
                1);
            var menuItem = new MenuItem(
                category.Id,
                "Món đã nấu xong",
                null,
                100_000m,
                null);
            var order = Order.CreateTakeaway(
                $"ORD-{DateTime.UtcNow:yyyyMMddHHmmssfff}",
                "Khách thanh toán sau khi nấu",
                "0901000088",
                null,
                null);
            var orderItem = new OrderItem(
                order.Id,
                menuItem.Id,
                menuItem.Name,
                2,
                menuItem.Price,
                null);

            orderItem.MarkCooking();
            orderItem.MarkReady();
            order.MarkReady();
            order.UpdateTotalAmount(orderItem.TotalPrice);

            var providerOrderCode = Random.Shared.Next(1_000_000, 10_000_000);
            paymentCode = $"DH{providerOrderCode:D7}";
            var paymentAttempt = new PaymentAttempt(
                order.Id,
                "SePay",
                providerOrderCode,
                216_000m,
                DateTime.UtcNow.AddMinutes(15));
            paymentAttempt.AttachPaymentRequest(
                paymentCode,
                $"https://img.vietqr.io/image/HDBank-{AccountNumber}-compact2.png" +
                $"?amount=216000&addInfo={paymentCode}",
                "PENDING");

            context.RestaurantSettings.Add(setting);
            context.MenuCategories.Add(category);
            context.MenuItems.Add(menuItem);
            context.Orders.Add(order);
            context.OrderItems.Add(orderItem);
            context.PaymentAttempts.Add(paymentAttempt);
            await context.SaveChangesAsync();

            orderId = order.Id;
            orderItemId = orderItem.Id;
        }

        using var request = new HttpRequestMessage(
            HttpMethod.Post,
            "/api/customer-payments/sepay/webhook")
        {
            Content = JsonContent.Create(new
            {
                id = 9_280_001L,
                gateway = "HDBank",
                transactionDate = DateTimeOffset.UtcNow
                    .ToOffset(TimeSpan.FromHours(7))
                    .ToString("yyyy-MM-dd HH:mm:ss"),
                accountNumber = AccountNumber,
                subAccount = "",
                code = paymentCode,
                content = $"{paymentCode} thanh toan don hang",
                transferType = "in",
                description = $"Khach hang chuyen tien {paymentCode}",
                transferAmount = 216_000m,
                accumulated = 1_000_000m,
                referenceCode = "READY-TAKEAWAY-COMPLETION"
            })
        };
        request.Headers.TryAddWithoutValidation(
            "Authorization",
            $"Apikey {WebhookApiKey}");

        using var response = await client.SendAsync(request);
        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        using (var json = JsonDocument.Parse(
                   await response.Content.ReadAsStringAsync()))
        {
            Assert.True(json.RootElement.GetProperty("success").GetBoolean());
        }

        using var verificationScope = factory.Services.CreateScope();
        var verificationContext = verificationScope.ServiceProvider
            .GetRequiredService<ApplicationDbContext>();

        var persistedOrder = await verificationContext.Orders
            .AsNoTracking()
            .SingleAsync(order => order.Id == orderId);
        var persistedItem = await verificationContext.OrderItems
            .AsNoTracking()
            .SingleAsync(item => item.Id == orderItemId);
        var payment = await verificationContext.Payments
            .AsNoTracking()
            .SingleAsync(item => item.OrderId == orderId);

        Assert.Equal("Completed", persistedOrder.Status);
        Assert.Equal("Served", persistedItem.Status);
        Assert.Equal("Paid", payment.Status);
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
                        ["SePay:PaymentPrefix"] = "DH",
                        ["SePay:RequireWebhookReadiness"] = "false",
                        ["SePay:WebhookHeartbeatTimeoutSeconds"] = "35"
                    })));
    }
}
