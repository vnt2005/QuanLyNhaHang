using Microsoft.EntityFrameworkCore;
using QuanLyNhaHang.Application.Common.Payments;
using QuanLyNhaHang.Application.Features.Payments.Queries.GetWithPaginatedList;
using QuanLyNhaHang.Domain.Entities;
using QuanLyNhaHang.Infrastructure.Persistence;
using Xunit;

namespace QuanLyNhaHang.UnitTests.Application;

public sealed class PaymentPaginationSummaryTests
{
    [Fact]
    public async Task Handle_SummaryIncludesEveryVerifiedSePayMatch_NotOnlyCurrentPage()
    {
        var options = new DbContextOptionsBuilder<ApplicationDbContext>()
            .UseInMemoryDatabase($"payment-summary-{Guid.NewGuid()}")
            .Options;

        await using var context = new ApplicationDbContext(options);

        var verifiedPayments = new List<Payment>();
        var attempts = new List<PaymentAttempt>();

        foreach (var index in Enumerable.Range(1, 11))
        {
            var amount = index * 10_000m;
            var orderId = Guid.NewGuid();
            var payment = new Payment(
                orderId,
                amount,
                0,
                0,
                amount,
                "BankTransfer",
                $"SePay | transactionId=verified-{index}");

            var attempt = new PaymentAttempt(
                orderId,
                "SePay",
                10_000L + index,
                amount,
                DateTime.UtcNow.AddMinutes(10));
            attempt.AttachPaymentRequest(
                $"payment-link-{index}",
                $"https://pay.sepay.vn/test/{index}",
                "PENDING");
            attempt.MarkPaid(
                payment.Id,
                amount,
                $"transaction-{index}");

            verifiedPayments.Add(payment);
            attempts.Add(attempt);
        }

        // Dữ liệu thanh toán thủ công/không được SePay xác minh có thể còn tồn tại
        // trong lịch sử cũ nhưng không được xuất hiện trong màn Thanh toán read-only.
        var legacyCashPayment = new Payment(
            Guid.NewGuid(),
            999_000m,
            0,
            0,
            999_000m,
            "Cash",
            "Legacy manual payment");
        var unverifiedTransfer = new Payment(
            Guid.NewGuid(),
            888_000m,
            0,
            0,
            888_000m,
            "BankTransfer",
            "Transfer without verified SePay attempt");

        context.Payments.AddRange(verifiedPayments);
        context.Payments.AddRange(legacyCashPayment, unverifiedTransfer);
        context.PaymentAttempts.AddRange(attempts);
        await context.SaveChangesAsync();

        var handler = new GetPaymentsWithPaginatedListQueryHandler(context);

        var result = await handler.Handle(
            new GetPaymentsWithPaginatedListQuery
            {
                PageNumber = 1,
                PageSize = 10
            },
            CancellationToken.None);

        Assert.Equal(10, result.Items.Count);
        Assert.Equal(11, result.TotalCount);
        Assert.Equal(2, result.TotalPages);
        Assert.Equal(11, result.PaidCount);
        Assert.Equal(0, result.CancelledCount);
        Assert.Equal(660_000m, result.Revenue);
        Assert.True(result.HasNextPage);
        Assert.All(result.Items, payment =>
            Assert.Equal("BankTransfer", payment.PaymentMethod));
    }

    [Fact]
    public async Task Handle_ExcludesLegacyManualTransfer_WhenPaidAttemptHasNoWebhookReference()
    {
        var options = new DbContextOptionsBuilder<ApplicationDbContext>()
            .UseInMemoryDatabase($"payment-legacy-manual-{Guid.NewGuid()}")
            .Options;

        await using var context = new ApplicationDbContext(options);

        const decimal amount = 10_000m;
        var orderId = Guid.NewGuid();
        var payment = new Payment(
            orderId,
            amount,
            0,
            0,
            amount,
            "BankTransfer",
            "SePay | transactionId=legacy-manual-webapp");

        var legacyAttempt = new PaymentAttempt(
            orderId,
            "SePay",
            88_888L,
            amount,
            DateTime.UtcNow.AddMinutes(10));
        legacyAttempt.AttachPaymentRequest(
            "legacy-payment-link",
            "https://pay.sepay.vn/legacy",
            "PENDING");

        // Mô phỏng dữ liệu cũ từng bị Web App tự ghi Paid: có attempt và PaymentId,
        // nhưng không có transaction id do webhook SePay cung cấp.
        legacyAttempt.MarkPaid(payment.Id, amount, null, "PAID");

        context.Payments.Add(payment);
        context.PaymentAttempts.Add(legacyAttempt);
        await context.SaveChangesAsync();

        Assert.False(await VerifiedSePayPaymentPolicy.IsVerifiedAsync(
            payment,
            context,
            CancellationToken.None));

        var handler = new GetPaymentsWithPaginatedListQueryHandler(context);
        var result = await handler.Handle(
            new GetPaymentsWithPaginatedListQuery
            {
                PageNumber = 1,
                PageSize = 10
            },
            CancellationToken.None);

        Assert.Empty(result.Items);
        Assert.Equal(0, result.TotalCount);
        Assert.Equal(0m, result.Revenue);
    }
}
