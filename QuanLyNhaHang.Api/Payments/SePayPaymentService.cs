using System.Globalization;
using System.Security.Cryptography;
using System.Text;
using System.Text.RegularExpressions;

namespace QuanLyNhaHang.Api.Payments;

public sealed record SePayPaymentInstruction(
    string PaymentCode,
    string QrCodeUrl,
    string BankCode,
    string AccountNumber,
    string AccountHolder);

public sealed class SePayWebhookTransaction
{
    public long Id { get; set; }
    public string Gateway { get; set; } = string.Empty;
    public string TransactionDate { get; set; } = string.Empty;
    public string AccountNumber { get; set; } = string.Empty;
    public string? SubAccount { get; set; }
    public string? Code { get; set; }
    public string? Content { get; set; }
    public string TransferType { get; set; } = string.Empty;
    public string? Description { get; set; }
    public decimal TransferAmount { get; set; }
    public decimal? Accumulated { get; set; }
    public string? ReferenceCode { get; set; }
}

public sealed class SePayPaymentService
{
    private readonly string _webhookApiKey;
    private readonly Regex _paymentCodeRegex;

    public string BankCode { get; }
    public string AccountNumber { get; }
    public string AccountHolder { get; }
    public string PaymentPrefix { get; }

    public bool IsConfigured =>
        !string.IsNullOrWhiteSpace(BankCode) &&
        !string.IsNullOrWhiteSpace(AccountNumber) &&
        !string.IsNullOrWhiteSpace(AccountHolder) &&
        !string.IsNullOrWhiteSpace(_webhookApiKey) &&
        Regex.IsMatch(PaymentPrefix, "^[A-Z]{2,5}$", RegexOptions.CultureInvariant);

    public SePayPaymentService(IConfiguration configuration)
    {
        BankCode = (configuration["SePay:BankCode"] ?? "HDBank").Trim();
        AccountNumber = NormalizeAccountNumber(configuration["SePay:AccountNumber"]);
        AccountHolder = (configuration["SePay:AccountHolder"] ?? string.Empty).Trim();
        _webhookApiKey = (configuration["SePay:WebhookApiKey"] ?? string.Empty).Trim();
        PaymentPrefix = (configuration["SePay:PaymentPrefix"] ?? "DH")
            .Trim()
            .ToUpperInvariant();

        _paymentCodeRegex = new Regex(
            $@"(?<![A-Z0-9])({Regex.Escape(PaymentPrefix)}\d{{7}})(?!\d)",
            RegexOptions.Compiled | RegexOptions.CultureInvariant | RegexOptions.IgnoreCase);
    }

    public SePayPaymentInstruction CreatePaymentInstruction(long providerOrderCode, int amount)
    {
        EnsureConfigured();

        if (providerOrderCode is < 1_000_000 or > 9_999_999)
            throw new ArgumentOutOfRangeException(nameof(providerOrderCode));

        if (amount <= 0)
            throw new ArgumentOutOfRangeException(nameof(amount));

        var paymentCode = GetPaymentCode(providerOrderCode);
        var query = string.Join('&', new[]
        {
            $"acc={Encode(AccountNumber)}",
            $"bank={Encode(BankCode)}",
            $"amount={amount.ToString(CultureInfo.InvariantCulture)}",
            $"des={Encode(paymentCode)}",
            "template=compact",
            "showinfo=true",
            "fullacc=true",
            $"holder={Encode(AccountHolder)}"
        });

        return new SePayPaymentInstruction(
            paymentCode,
            $"https://vietqr.app/img?{query}",
            BankCode,
            AccountNumber,
            AccountHolder);
    }

    public string GetPaymentCode(long providerOrderCode)
        => $"{PaymentPrefix}{providerOrderCode:D7}";

    public string? ExtractPaymentCode(SePayWebhookTransaction transaction)
    {
        var directCode = NormalizeDirectPaymentCode(transaction.Code);
        if (directCode != null)
            return directCode;

        foreach (var candidate in new[] { transaction.Content, transaction.Description })
        {
            if (string.IsNullOrWhiteSpace(candidate))
                continue;

            var match = _paymentCodeRegex.Match(candidate);
            if (match.Success)
                return match.Groups[1].Value.ToUpperInvariant();
        }

        return null;
    }

    public bool IsExpectedAccount(string? accountNumber)
        => !string.IsNullOrWhiteSpace(AccountNumber) &&
           string.Equals(
               NormalizeAccountNumber(accountNumber),
               AccountNumber,
               StringComparison.Ordinal);

    public bool IsWebhookAuthorized(string? authorizationHeader)
    {
        if (string.IsNullOrWhiteSpace(_webhookApiKey) ||
            string.IsNullOrWhiteSpace(authorizationHeader))
        {
            return false;
        }

        const string prefix = "Apikey ";
        if (!authorizationHeader.StartsWith(prefix, StringComparison.OrdinalIgnoreCase))
            return false;

        var suppliedKey = authorizationHeader[prefix.Length..].Trim();
        var expectedBytes = Encoding.UTF8.GetBytes(_webhookApiKey);
        var suppliedBytes = Encoding.UTF8.GetBytes(suppliedKey);
        return expectedBytes.Length == suppliedBytes.Length &&
               CryptographicOperations.FixedTimeEquals(expectedBytes, suppliedBytes);
    }

    private void EnsureConfigured()
    {
        if (!IsConfigured)
        {
            throw new InvalidOperationException(
                "SePay chưa được cấu hình đầy đủ trên máy chủ.");
        }
    }

    private static string? NormalizeDirectPaymentCode(string? value)
    {
        if (string.IsNullOrWhiteSpace(value))
            return null;

        var normalized = value.Trim().ToUpperInvariant();
        return Regex.IsMatch(
            normalized,
            "^[A-Z]{2,5}[0-9]{1,10}$",
            RegexOptions.CultureInvariant)
            ? normalized
            : null;
    }

    private static string NormalizeAccountNumber(string? value)
        => string.IsNullOrWhiteSpace(value)
            ? string.Empty
            : string.Concat(value.Where(char.IsLetterOrDigit));

    private static string Encode(string value)
        => Uri.EscapeDataString(value);
}
