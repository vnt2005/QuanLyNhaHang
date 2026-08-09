using Microsoft.EntityFrameworkCore;
using QuanLyNhaHang.Application.Features.Payments.Queries.GetWithPaginatedList;
using QuanLyNhaHang.Domain.Entities;
using QuanLyNhaHang.Infrastructure.Persistence;
using Xunit;

namespace QuanLyNhaHang.UnitTests.Application;

public sealed class PaymentPaginationSummaryTests
{
    [Fact]
    public async Task Handle_SummaryIncludesEveryMatch_NotOnlyCurrentPage()
    {
        var options = new DbContextOptionsBuilder<ApplicationDbContext>()
            .UseInMemoryDatabase($"payment-summary-{Guid.NewGuid()}")
            .Options;

        await using var context = new ApplicationDbContext(options);

        var payments = Enumerable.Range(1, 11)
            .Select(index => new Payment(
                Guid.NewGuid(),
                index * 10_000m,
                0,
                0,
                index * 10_000m,
                "Cash",
                null))
            .ToList();
        payments[0].Cancel();

        context.Payments.AddRange(payments);
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
        Assert.Equal(10, result.PaidCount);
        Assert.Equal(1, result.CancelledCount);
        Assert.Equal(650_000m, result.Revenue);
        Assert.True(result.HasNextPage);
    }
}
