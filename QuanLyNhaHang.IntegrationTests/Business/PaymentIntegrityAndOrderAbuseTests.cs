using System.Net;
using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using QuanLyNhaHang.Application.Common.Constants;
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
    public async Task ManualBankTransfer_CannotBeCreatedEvenByAdmin()
    {
        using var factory = new ApiWebApplicationFactory();
        using var client = factory.CreateHttpsClient();
        await AuthenticateAdminAsync(factory, client);

        var orderId = await SeedServedTakeawayAsync(factory, "Khách giả chuyển khoản");

        using var response = await client.PostAsJsonAsync(
            "/api/payments",
            new
            {
                orderId,
                discountAmount = 0m,
                serviceChargeAmount = 0m,
                vatAmount = 0m,
                customerPaid = 100_000m,
                paymentMethod = "BankTransfer",
                note = "Nhân viên tự khai khách đã chuyển khoản",
                issueInvoice = true
            });

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        using var json = await ReadJsonAsync(response);
        Assert.Contains(
            "không được phép ghi nhận thủ công",
            json.RootElement.GetProperty("message").GetString());

        using var scope = factory.Services.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        Assert.False(await context.Payments.AnyAsync(x => x.OrderId == orderId));
    }

    [Fact]
    public async Task Manager_WithLegacyPaymentCreatePermission_StillCannotSettleAtCounter()
    {
        using var factory = new ApiWebApplicationFactory();
        using var client = factory.CreateHttpsClient();
        await AuthenticateRoleWithPaymentCreatePermissionAsync(
            factory,
            client,
            SystemRoles.Manager);

        var orderId = await SeedServedTakeawayAsync(factory, "Khách của quản lý");

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
                note = "Manager thử ghi nhận tiền tại quầy",
                issueInvoice = true
            });

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        using var json = await ReadJsonAsync(response);
        Assert.Contains(
            "Chỉ Admin hoặc Cashier",
            json.RootElement.GetProperty("message").GetString());
    }

    [Fact]
    public async Task Cashier_CounterPayment_CreatesImmutablePaymentInvoiceAndAuditLog()
    {
        using var factory = new ApiWebApplicationFactory();
        using var client = factory.CreateHttpsClient();
        var userId = await AuthenticateRoleWithPaymentCreatePermissionAsync(
            factory,
            client,
            SystemRoles.Cashier);

        var orderId = await SeedServedTakeawayAsync(factory, "Khách trả tiền mặt");
        var auditReason = $"Thu tiền mặt tại quầy REF-{Guid.NewGuid():N}";

        using var response = await client.PostAsJsonAsync(
            "/api/payments",
            new
            {
                orderId,
                discountAmount = 0m,
                serviceChargeAmount = 0m,
                vatAmount = 0m,
                customerPaid = 120_000m,
                paymentMethod = "Cash",
                note = auditReason,
                issueInvoice = true
            });

        Assert.Equal(HttpStatusCode.OK, response.StatusCode);

        using var scope = factory.Services.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        var payment = await context.Payments
            .AsNoTracking()
            .SingleAsync(x => x.OrderId == orderId);
        var order = await context.Orders
            .AsNoTracking()
            .SingleAsync(x => x.Id == orderId);

        Assert.Equal("Paid", payment.Status);
        Assert.Equal("Cash", payment.PaymentMethod);
        Assert.Equal(100_000m, payment.FinalAmount);
        Assert.Equal(20_000m, payment.ChangeAmount);
        Assert.Equal("Completed", order.Status);
        Assert.True(await context.Invoices.AnyAsync(
            invoice => invoice.PaymentId == payment.Id && invoice.Status != "Cancelled"));

        var auditLog = await context.ActivityLogs
            .AsNoTracking()
            .Where(log => log.UserId == userId && log.NewValues != null)
            .OrderByDescending(log => log.CreatedAt)
            .FirstOrDefaultAsync(log => log.NewValues!.Contains(auditReason));

        Assert.NotNull(auditLog);
        Assert.Equal("Success", auditLog!.Status);
        Assert.NotEqual(default, auditLog.CreatedAt);
    }

    [Fact]
    public async Task ManualPayment_RejectsClientSideQuoteTampering()
    {
        using var factory = new ApiWebApplicationFactory();
        using var client = factory.CreateHttpsClient();
        await AuthenticateAdminAsync(factory, client);

        var orderId = await SeedServedTakeawayAsync(factory, "Khách sửa số tiền");

        using var response = await client.PostAsJsonAsync(
            "/api/payments",
            new
            {
                orderId,
                discountAmount = 10_000m,
                serviceChargeAmount = 0m,
                vatAmount = 0m,
                customerPaid = 90_000m,
                paymentMethod = "Cash",
                note = "Cố tình sửa giảm giá từ client",
                issueInvoice = true
            });

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        using var json = await ReadJsonAsync(response);
        Assert.Contains(
            "backend tính toán",
            json.RootElement.GetProperty("message").GetString());

        using var scope = factory.Services.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        Assert.False(await context.Payments.AnyAsync(x => x.OrderId == orderId));
    }

    [Fact]
    public async Task ManualPayment_RequiresAuditReason()
    {
        using var factory = new ApiWebApplicationFactory();
        using var client = factory.CreateHttpsClient();
        await AuthenticateAdminAsync(factory, client);

        var orderId = await SeedServedTakeawayAsync(factory, "Khách thiếu lý do");

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
                note = "   ",
                issueInvoice = true
            });

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        using var json = await ReadJsonAsync(response);
        Assert.Contains(
            "bắt buộc ghi rõ lý do",
            json.RootElement.GetProperty("message").GetString());
    }

    [Fact]
    public async Task ManualNonCashPayment_RejectsDeclaredAmountDifferentFromServerTotal()
    {
        using var factory = new ApiWebApplicationFactory();
        using var client = factory.CreateHttpsClient();
        await AuthenticateAdminAsync(factory, client);

        var orderId = await SeedServedTakeawayAsync(factory, "Khách thanh toán thẻ");

        using var response = await client.PostAsJsonAsync(
            "/api/payments",
            new
            {
                orderId,
                discountAmount = 0m,
                serviceChargeAmount = 0m,
                vatAmount = 0m,
                customerPaid = 110_000m,
                paymentMethod = "Card",
                note = "Đối chiếu giao dịch thẻ tại quầy TEST-001",
                issueInvoice = true
            });

        Assert.Equal(HttpStatusCode.BadRequest, response.StatusCode);
        using var json = await ReadJsonAsync(response);
        Assert.Contains(
            "đúng số tiền backend yêu cầu",
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
    public async Task PaidManualPayment_CannotBeUpdatedOrCancelled()
    {
        using var factory = new ApiWebApplicationFactory();
        using var client = factory.CreateHttpsClient();
        await AuthenticateAdminAsync(factory, client);

        var (orderId, paymentId) = await SeedPaidManualPaymentAsync(factory);

        using var updateResponse = await client.PutAsJsonAsync(
            $"/api/payments/{paymentId}",
            new
            {
                discountAmount = 0m,
                serviceChargeAmount = 0m,
                vatAmount = 0m,
                customerPaid = 100_000m,
                paymentMethod = "Card",
                note = "Thử đổi payment đã chốt"
            });

        Assert.Equal(HttpStatusCode.BadRequest, updateResponse.StatusCode);
        using var updateJson = await ReadJsonAsync(updateResponse);
        Assert.Contains(
            "dữ liệu tài chính bất biến",
            updateJson.RootElement.GetProperty("message").GetString());

        using var cancelResponse = await client.DeleteAsync($"/api/payments/{paymentId}");
        Assert.Equal(HttpStatusCode.BadRequest, cancelResponse.StatusCode);
        using var cancelJson = await ReadJsonAsync(cancelResponse);
        Assert.Contains(
            "không thể hủy trực tiếp",
            cancelJson.RootElement.GetProperty("message").GetString());

        using var duplicateResponse = await client.PostAsJsonAsync(
            "/api/payments",
            new
            {
                orderId,
                discountAmount = 0m,
                serviceChargeAmount = 0m,
                vatAmount = 0m,
                customerPaid = 100_000m,
                paymentMethod = "Cash",
                note = "Thử thanh toán trùng",
                issueInvoice = true
            });
        Assert.Equal(HttpStatusCode.BadRequest, duplicateResponse.StatusCode);

        using var verificationScope = factory.Services.CreateScope();
        var context = verificationScope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        var payments = await context.Payments
            .AsNoTracking()
            .Where(x => x.OrderId == orderId)
            .ToListAsync();
        var payment = Assert.Single(payments);
        Assert.Equal("Paid", payment.Status);
        Assert.Equal("Cash", payment.PaymentMethod);
        Assert.Equal(100_000m, payment.FinalAmount);
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
            "dữ liệu tài chính bất biến",
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

    private static async Task<Guid> SeedServedTakeawayAsync(
        ApiWebApplicationFactory factory,
        string customerName)
    {
        using var scope = factory.Services.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        await context.Database.EnsureCreatedAsync();

        var category = new MenuCategory(
            $"Payment security {Guid.NewGuid():N}",
            null,
            1);
        var menuItem = new MenuItem(
            category.Id,
            $"Món test thanh toán {Guid.NewGuid():N}",
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

    private static async Task<(Guid OrderId, Guid PaymentId)> SeedPaidManualPaymentAsync(
        ApiWebApplicationFactory factory)
    {
        using var scope = factory.Services.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
        await context.Database.EnsureCreatedAsync();

        var order = Order.CreateTakeaway(
            $"ORD-{Guid.NewGuid():N}",
            "Khách đã trả tiền mặt",
            "0901000005",
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
            "Cash",
            "Thu tiền mặt tại quầy; đối chiếu TEST-CASH-001");

        context.Orders.Add(order);
        context.Payments.Add(payment);
        await context.SaveChangesAsync();

        return (order.Id, payment.Id);
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

    private static async Task<Guid> AuthenticateRoleWithPaymentCreatePermissionAsync(
        ApiWebApplicationFactory factory,
        HttpClient client,
        string roleName)
    {
        var suffix = Guid.NewGuid().ToString("N");
        var email = $"payment-role-{roleName.ToLowerInvariant()}-{suffix}@example.com";
        const string password = "Password123!";
        var userId = await factory.SeedUserAsync(
            email,
            password,
            role: roleName);

        using (var scope = factory.Services.CreateScope())
        {
            var context = scope.ServiceProvider.GetRequiredService<ApplicationDbContext>();
            var role = await context.Roles.FirstOrDefaultAsync(x => x.Name == roleName);
            if (role == null)
            {
                role = new Role(roleName, roleName, "Payment integrity test role");
                context.Roles.Add(role);
            }

            var permission = await context.Permissions
                .FirstOrDefaultAsync(x => x.Code == PermissionCodes.PaymentsCreate);
            if (permission == null)
            {
                permission = new Permission(
                    PermissionCodes.PaymentsCreate,
                    "Ghi nhận thanh toán",
                    "Payments",
                    null);
                context.Permissions.Add(permission);
            }

            if (!await context.RolePermissions.AnyAsync(
                    x => x.RoleId == role.Id && x.PermissionId == permission.Id))
            {
                context.RolePermissions.Add(new RolePermission(role.Id, permission.Id));
            }

            await context.SaveChangesAsync();
        }

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

        return userId;
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
