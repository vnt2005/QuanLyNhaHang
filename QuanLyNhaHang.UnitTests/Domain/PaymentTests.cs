using QuanLyNhaHang.Domain.Entities;
using Xunit;

namespace QuanLyNhaHang.UnitTests.Domain;

public sealed class PaymentTests
{
    [Fact]
    public void Constructor_CalculatesFinalAndChangeAmounts()
    {
        var beforeCreation = DateTime.UtcNow;

        var payment = new Payment(
            Guid.NewGuid(),
            500_000m,
            50_000m,
            45_000m,
            600_000m,
            "Cash",
            "  Thanh toán tại quầy  ");

        Assert.NotEqual(Guid.Empty, payment.Id);
        Assert.StartsWith("PAY-", payment.PaymentCode);
        Assert.Equal(495_000m, payment.FinalAmount);
        Assert.Equal(105_000m, payment.ChangeAmount);
        Assert.Equal("Cash", payment.PaymentMethod);
        Assert.Equal("Paid", payment.Status);
        Assert.Equal("Thanh toán tại quầy", payment.Note);
        Assert.InRange(payment.PaidAt, beforeCreation, DateTime.UtcNow);
        Assert.InRange(payment.CreatedAt, beforeCreation, DateTime.UtcNow);
    }

    [Fact]
    public void UpdateInfo_RecalculatesAmounts()
    {
        var payment = CreatePayment();

        payment.UpdateInfo(
            20_000m,
            10_000m,
            120_000m,
            "Card",
            "  Đã đối soát  ");

        Assert.Equal(90_000m, payment.FinalAmount);
        Assert.Equal(30_000m, payment.ChangeAmount);
        Assert.Equal("Card", payment.PaymentMethod);
        Assert.Equal("Đã đối soát", payment.Note);
        Assert.NotNull(payment.UpdatedAt);
    }

    [Theory]
    [InlineData(-1, 0, 0)]
    [InlineData(100_000, -1, 0)]
    [InlineData(100_000, 100_001, 0)]
    [InlineData(100_000, 0, -1)]
    public void Constructor_RejectsInvalidAmounts(
        decimal total,
        decimal discount,
        decimal vat)
    {
        Assert.Throws<ArgumentException>(() => new Payment(
            Guid.NewGuid(),
            total,
            discount,
            vat,
            200_000m,
            "Cash",
            null));
    }

    [Fact]
    public void Constructor_RejectsZeroFinalAmount()
    {
        Assert.Throws<ArgumentException>(() => new Payment(
            Guid.NewGuid(),
            100_000m,
            100_000m,
            0,
            0,
            "Cash",
            null));
    }

    [Fact]
    public void UpdateInfo_RejectsZeroFinalAmount()
    {
        var payment = CreatePayment();

        Assert.Throws<ArgumentException>(() => payment.UpdateInfo(
            100_000m,
            0,
            0,
            "Cash",
            null));
    }

    [Fact]
    public void Constructor_AcceptsFrontendEWalletMethod()
    {
        var payment = new Payment(
            Guid.NewGuid(),
            100_000m,
            0,
            0,
            100_000m,
            "EWallet",
            null);

        Assert.Equal("EWallet", payment.PaymentMethod);
    }

    [Fact]
    public void Constructor_RejectsInsufficientCustomerPayment()
    {
        Assert.Throws<ArgumentException>(() => new Payment(
            Guid.NewGuid(),
            100_000m,
            0,
            10_000m,
            109_999m,
            "Cash",
            null));
    }

    [Theory]
    [InlineData("")]
    [InlineData("cash")]
    [InlineData("Crypto")]
    public void Constructor_RejectsInvalidPaymentMethod(string method)
    {
        Assert.Throws<ArgumentException>(() => new Payment(
            Guid.NewGuid(),
            100_000m,
            0,
            0,
            100_000m,
            method,
            null));
    }

    [Fact]
    public void Constructor_RejectsEmptyOrderId()
    {
        Assert.Throws<ArgumentException>(() => new Payment(
            Guid.Empty,
            100_000m,
            0,
            0,
            100_000m,
            "Cash",
            null));
    }

    [Fact]
    public void Cancel_ChangesStatusAndRejectsSecondCancellation()
    {
        var payment = CreatePayment();

        payment.Cancel();

        Assert.Equal("Cancelled", payment.Status);
        Assert.NotNull(payment.UpdatedAt);
        Assert.Throws<InvalidOperationException>(() =>
            payment.Cancel());
    }

    private static Payment CreatePayment()
    {
        return new Payment(
            Guid.NewGuid(),
            100_000m,
            0,
            0,
            100_000m,
            "Cash",
            null);
    }
}
