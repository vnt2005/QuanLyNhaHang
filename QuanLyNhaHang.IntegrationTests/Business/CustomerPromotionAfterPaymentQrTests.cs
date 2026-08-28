using System.Net;
using System.Net.Http.Json;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using QuanLyNhaHang.Domain.Entities;
using QuanLyNhaHang.Infrastructure.Persistence;
using QuanLyNhaHang.IntegrationTests.Infrastructure;
using Xunit;

namespace QuanLyNhaHang.IntegrationTests.Business;

public sealed class CustomerPromotionAfterPaymentQrTests
{
    [Fact]
    public async Task ApplyPromotion_AfterQrWasCreated_CancelsOldQrAndAppliesPromotion()
    {
        using var factory = new ApiWebApplicationFactory();
        using var client = factory.CreateHttpsClient();

        var seeded = await SeedOrderWithPromotionAndPendingAttemptAsync(factory);

        using var response = await client.PostAsJsonAsync(
            $"/api/customer-promotions/orders/{seeded.OrderId}/apply",
            new
            {
                promotionCode = seeded.PromotionCode,
                qrToken = (string?)null
            });

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        using var scope = factory.Services.CreateScope();
        var context = scope.ServiceProvider
            .GetRequiredService<ApplicationDbContext>();

        var attempt = await context.PaymentAttempts
            .AsNoTracking()
            .SingleAsync(item => item.Id == seeded.PaymentAttemptId);
        var usage = await context.PromotionUsages
            .AsNoTracking()
            .SingleAsync(item =>
                item.OrderId == seeded.OrderId &&
                item.Status == "Applied");

        Assert.Equal(PaymentAttempt.CancelledStatus, attempt.Status);
        Assert.Contains(
            "PromotionAppliedAfterPaymentQrCreated",
            attempt.ReviewReason ?? string.Empty);
        Assert.Equal(10_000m, usage.DiscountAmount);
        Assert.Contains("QR thanh toán cũ", usage.Note ?? string.Empty);
    }

    [Fact]
    public async Task InvalidPromotion_DoesNotCancelExistingPendingQr()
    {
        using var factory = new ApiWebApplicationFactory();
        using var client = factory.CreateHttpsClient();

        var seeded = await SeedOrderWithPromotionAndPendingAttemptAsync(factory);

        using var response = await client.PostAsJsonAsync(
            $"/api/customer-promotions/orders/{seeded.OrderId}/apply",
            new
            {
                promotionCode = "KHONG-TON-TAI",
                qrToken = (string?)null
            });

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);

        using var scope = factory.Services.CreateScope();
        var context = scope.ServiceProvider
            .GetRequiredService<ApplicationDbContext>();

        var attempt = await context.PaymentAttempts
            .AsNoTracking()
            .SingleAsync(item => item.Id == seeded.PaymentAttemptId);

        Assert.Equal(PaymentAttempt.PendingStatus, attempt.Status);
        Assert.False(await context.PromotionUsages
            .AsNoTracking()
            .AnyAsync(item => item.OrderId == seeded.OrderId));
    }

    private static async Task<SeededPromotionOrder>
        SeedOrderWithPromotionAndPendingAttemptAsync(
            ApiWebApplicationFactory factory)
    {
        using var scope = factory.Services.CreateScope();
        var context = scope.ServiceProvider
            .GetRequiredService<ApplicationDbContext>();
        await context.Database.EnsureCreatedAsync();

        var category = new MenuCategory(
            $"Promotion after QR {Guid.NewGuid():N}",
            null,
            1);
        var menuItem = new MenuItem(
            category.Id,
            "Món áp mã sau QR",
            null,
            100_000m,
            null);
        var order = Order.CreateTakeaway(
            $"ORD-{Guid.NewGuid():N}",
            "Khách quay lại áp mã",
            "0901000030",
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

        var promotionCode = $"BACK{Random.Shared.Next(1000, 9999)}";
        var promotion = new Promotion(
            promotionCode,
            "Giảm 10% khi quay lại thanh toán",
            null,
            "Percent",
            10m,
            0m,
            null,
            DateTime.UtcNow.AddDays(-1),
            DateTime.UtcNow.AddDays(1),
            100);

        var paymentAttempt = new PaymentAttempt(
            order.Id,
            "SePay",
            Random.Shared.NextInt64(1, long.MaxValue),
            order.TotalAmount,
            DateTime.UtcNow.AddMinutes(15));
        paymentAttempt.AttachPaymentRequest(
            $"DH{Guid.NewGuid():N}"[..12].ToUpperInvariant(),
            "https://img.vietqr.io/image/TPBank-test-compact2.png",
            "PENDING");

        context.MenuCategories.Add(category);
        context.MenuItems.Add(menuItem);
        context.Orders.Add(order);
        context.OrderItems.Add(orderItem);
        context.Promotions.Add(promotion);
        context.PaymentAttempts.Add(paymentAttempt);
        await context.SaveChangesAsync();

        return new SeededPromotionOrder(
            order.Id,
            paymentAttempt.Id,
            promotion.PromotionCode);
    }

    private sealed record SeededPromotionOrder(
        Guid OrderId,
        Guid PaymentAttemptId,
        string PromotionCode);
}
