namespace QuanLyNhaHang.Application.Common.Payments;

public sealed record PaymentInstruction(
    string PaymentCode,
    string QrCodeUrl,
    string BankCode,
    string AccountNumber,
    string AccountHolder);

public interface IPaymentGateway
{
    string Provider { get; }

    bool IsConfigured { get; }

    PaymentInstruction CreatePaymentInstruction(
        long providerOrderCode,
        int amount);
}
