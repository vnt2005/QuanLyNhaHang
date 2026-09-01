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

        var firstRequest = new
        {
            customerName = "Khách đặt lặp",
            phoneNumber = "0901000002",
            note = "Đơn thứ nhất",
            items = new[]
            {
                new { menuItemId, quantity = 1 }
            }
        };

        using var firstResponse = await client.PostAsJsonAsync(
            "/api/customer-site/takeaway-orders",
            firstRequest);
        Assert.Equal(HttpStatusCode.OK, firstResponse.StatusCode);

        // Dùng payload khác để đây thực sự là một yêu cầu tạo đơn mới,
        // không phải retry giống hệt được idempotency middleware replay.
        var secondRequest = new
        {
            customerName = "Khách đặt lặp",
            phoneNumber = "0901000002",
            note = "Đơn thứ hai",
            items = new[]
            {
                new { menuItemId, quantity = 1 }
            }
        };

        using var secondResponse = await client.PostAsJsonAsync(
            "/api/customer-site/takeaway-orders",
            secondRequest);

        Assert.Equal(HttpStatusCode.BadRequest, secondResponse.StatusCode);
        using var json = await ReadJsonAsync(secondResponse);
        Assert.Contains(
            "đơn mang về chưa hoàn tất",
            json.RootElement.GetProperty("message").GetString());
    }

    [Fact]
    public async Task ManualPayment_IsBlockedWhileOnlineAttemptIsPending()
    {
        using var factory = new ApiWebApplicationFactory();
        using var client = factory.CreateHttpsClient();
        await AuthenticateAdminAsync(factory, client);

        var orderId = await SeedServedTakeawayWithPendingOnlineAttemptAsync(factory);

        using var response = await client.PostAsJsonAsync(
            "/api/payments",
            new
            {
                orderId,
                discountAmount = 0m,
                serviceChargeAmount = 0m,
                vatAmount = 0m,
                customerPaid = 100_000m,
                paymentMethod = "Cash",
                note = "Không được thu khi QR online còn hiệu lực",
                issueInvoice = true
            });

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        using var json = await ReadJsonAsync(response);
        Assert.Contains(
            "phiên thanh toán online còn hiệu lực",
            json.RootElement.GetProperty("message").GetString());

        using var scope = factory.Services.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        Assert.False(await context.Payments.AnyAsync(x => x.OrderId == orderId));
    }

    [Fact]
    public async Task SettledOnlinePayment_CannotBeUpdatedOrCancelled()
    {
        using var factory = new ApiWebApplicationFactory();
        using var client = factory.CreateHttpsClient();
        await AuthenticateAdminAsync(factory, client);

        var paymentId = await SeedSettledOnlinePaymentAsync(factory);

        using var updateResponse = await client.PutAsJsonAsync(
            $"/api/payments/{paymentId}",
            new
            {
                discountAmount = 0m,
                serviceChargeAmount = 0m,
                vatAmount = 0m,
                customerPaid = 100_000m,
                paymentMethod = "Cash",
                note = "Thử sửa giao dịch online"
            });

        Assert.Equal(HttpStatusCode.BadRequest, updateResponse.StatusCode);
        using var updateJson = await ReadJsonAsync(updateResponse);
        Assert.Contains(
            "khóa đối soát",
            updateJson.RootElement.GetProperty("message").GetString());

        using var cancelResponse = await client.DeleteAsync(
            $"/api/payments/{paymentId}");

        Assert.Equal(HttpStatusCode.BadRequest, cancelResponse.StatusCode);
        using var cancelJson = await ReadJsonAsync(cancelResponse);
        Assert.Contains(
            "không hoàn tiền",
            cancelJson.RootElement.GetProperty("message").GetString());

        using var verificationScope = factory.Services.CreateScope();
        var context = verificationScope.ServiceProvider
            .GetRequiredService<ApplicationDbContext>();
        var payment = await context.Payments
            .AsNoTracking()
            .SingleAsync(x => x.Id == paymentId);

        Assert.Equal("Paid", payment.Status);
        Assert.Equal("BankTransfer", payment.PaymentMethod);
        Assert.Equal(100_000m, payment.FinalAmount);
    }

    private static async Task<Guid> SeedMenuItemAsync(
        ApiWebApplicationFactory factory)
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

    private static async Task<Guid> SeedServedTakeawayWithPendingOnlineAttemptAsync(
        ApiWebApplicationFactory factory)
    {
        using var scope = factory.Services.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        await context.Database.EnsureCreatedAsync();

        var category = new MenuCategory(
            $"Payment category {Guid.NewGuid():N}",
            null,
            1);
        var menuItem = new MenuItem(
            category.Id,
            "Món chờ thanh toán online",
            null,
            100_000m,
            null);
        var order = Order.CreateTakeaway(
            $"ORD-{Guid.NewGuid():N}",
            "Khách chờ QR",
            "0901000003",
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

        var attempt = new PaymentAttempt(
            order.Id,
            "SePay",
            DateTimeOffset.UtcNow.ToUnixTimeMilliseconds(),
            order.TotalAmount,
            DateTime.UtcNow.AddMinutes(15));
        attempt.AttachPaymentRequest(
            $"DH{Guid.NewGuid():N}"[..12].ToUpperInvariant(),
            "https://img.vietqr.io/image/TPBank-test-compact2.png",
            "PENDING");

        context.MenuCategories.Add(category);
        context.MenuItems.Add(menuItem);
        context.Orders.Add(order);
        context.OrderItems.Add(orderItem);
        context.PaymentAttempts.Add(attempt);
        await context.SaveChangesAsync();

        return order.Id;
    }

    private static async Task<Guid> SeedSettledOnlinePaymentAsync(
        ApiWebApplicationFactory factory)
    {
        using var scope = factory.Services.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        await context.Database.EnsureCreatedAsync();

        var order = Order.CreateTakeaway(
            $"ORD-{Guid.NewGuid():N}",
            "Khách đã chuyển khoản",
            "0901000004",
            null,
            null);
        order.UpdateTotalAmount(100_000m);
        order.MarkCompleted();

        var payment = new Payment(
            order.Id,
            100_000m,
            0m,
            0m,
            100_000m,
            "BankTransfer",
            "SePay đã xác nhận");

        var attempt = new PaymentAttempt(
            order.Id,
            "SePay",
            DateTimeOffset.UtcNow.ToUnixTimeMilliseconds(),
            100_000m,
            DateTime.UtcNow.AddMinutes(15));
        attempt.AttachPaymentRequest(
            $"DH{Guid.NewGuid():N}"[..12].ToUpperInvariant(),
            "https://img.vietqr.io/image/TPBank-test-compact2.png",
            "PENDING");
        attempt.MarkPaid(
            payment.Id,
            100_000m,
            $"SEPAY-{Guid.NewGuid():N}",
            "PAID");

        context.Orders.Add(order);
        context.Payments.Add(payment);
        context.PaymentAttempts.Add(attempt);
        await context.SaveChangesAsync();

        return payment.Id;
    }

    private static async Task AuthenticateAdminAsync(
        ApiWebApplicationFactory factory,
        HttpClient client)
    {
        var email = $"payment-integrity-{Guid.NewGuid():N}@example.com";
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
