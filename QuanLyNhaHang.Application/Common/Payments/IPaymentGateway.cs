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

    string BankCode { get; }

    bool IsConfigured { get; }

    PaymentInstruction CreatePaymentInstruction(
        long providerOrderCode,
        int amount);

    bool IsWebhookAuthorized(string? authorizationHeader);

    bool IsExpectedAccount(string? accountNumber);

    string? ExtractPaymentCode(
        string? directCode,
        string? content,
        string? description);

    DateTime? ParseTransactionUtc(string? transactionDate);
}
