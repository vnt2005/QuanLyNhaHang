using QuanLyNhaHang.Domain.Entities;
using Xunit;

namespace QuanLyNhaHang.UnitTests.Domain;

public sealed class InvoiceTests
{
    [Fact]
    public void UpdatePaymentSnapshot_SynchronizesFinancialValues()
    {
        var invoice = CreateInvoice();

        invoice.UpdatePaymentSnapshot(
            250_000m,
            20_000m,
            10_000m,
            255_000m,
            300_000m,
            45_000m,
            "EWallet");

        Assert.Equal(250_000m, invoice.TotalAmount);
        Assert.Equal(20_000m, invoice.DiscountAmount);
        Assert.Equal(15_000m, invoice.ServiceChargeAmount);
        Assert.Equal(10_000m, invoice.VatAmount);
        Assert.Equal(255_000m, invoice.FinalAmount);
        Assert.Equal(300_000m, invoice.CustomerPaid);
        Assert.Equal(45_000m, invoice.ChangeAmount);
        Assert.Equal("EWallet", invoice.PaymentMethod);
        Assert.NotNull(invoice.UpdatedAt);
    }

    [Fact]
    public void ServiceChargeAmount_DerivesFromFinancialSnapshot()
    {
        var invoice = new Invoice(
            Guid.NewGuid(),
            Guid.NewGuid(),
            Guid.NewGuid(),
            "ORD-SERVICE",
            "PAY-SERVICE",
            "Bàn 2",
            250_000m,
            25_000m,
            24_188m,
            266_063m,
            300_000m,
            33_937m,
            "Cash",
            null);

        Assert.Equal(16_875m, invoice.ServiceChargeAmount);
    }

    [Fact]
    public void UpdatePaymentSnapshot_RejectsCancelledInvoice()
    {
        var invoice = CreateInvoice();
        invoice.Cancel();

        Assert.Throws<InvalidOperationException>(() =>
            invoice.UpdatePaymentSnapshot(
                250_000m,
                20_000m,
                10_000m,
                240_000m,
                300_000m,
                60_000m,
                "Card"));
    }

    private static Invoice CreateInvoice()
    {
        return new Invoice(
            Guid.NewGuid(),
            Guid.NewGuid(),
            Guid.NewGuid(),
            "ORD-TEST",
            "PAY-TEST",
            "Bàn 1",
            250_000m,
            25_000m,
            22_500m,
            247_500m,
            300_000m,
            52_500m,
            "Cash",
            null);
    }
}
