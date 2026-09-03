using Microsoft.EntityFrameworkCore;
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
}
