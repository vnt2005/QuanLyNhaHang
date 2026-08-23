namespace QuanLyNhaHang.Application.Common.Payments;

public interface IPaymentWebhookAdapter
{
    string DefaultGateway { get; }

    bool IsAuthorized(string? authorizationHeader);

    bool IsExpectedAccount(string? accountNumber);

    string? ExtractPaymentCode(
        string? directCode,
        string? content,
        string? description);

    DateTime? ParseTransactionUtc(string? transactionDate);
}
