using System.Globalization;
using System.Security.Cryptography;
using System.Text;
using System.Text.RegularExpressions;
using Microsoft.Extensions.Options;
using QuanLyNhaHang.Application.Common.Payments;

namespace QuanLyNhaHang.Infrastructure.Payments.SePay;

public sealed class SePayOptions
{
    public const string SectionName = "SePay";

    public string BankCode { get; set; } = "TPBank";
    public string AccountNumber { get; set; } = string.Empty;
    public string AccountHolder { get; set; } = string.Empty;
    public string WebhookApiKey { get; set; } = string.Empty;
    public string PaymentPrefix { get; set; } = "DH";
}

public sealed class SePayPaymentGateway : IPaymentGateway
{
    private static readonly TimeSpan VietnamUtcOffset = TimeSpan.FromHours(7);
    private readonly string _webhookApiKey;
    private readonly string _paymentPrefix;
    private readonly Regex _paymentCodeRegex;

    public string Provider => "SePay";

    public string BankCode { get; }

    public string AccountNumber { get; }

    public string AccountHolder { get; }

    public bool IsConfigured =>
        !string.IsNullOrWhiteSpace(BankCode) &&
        !string.IsNullOrWhiteSpace(AccountNumber) &&
        !string.IsNullOrWhiteSpace(AccountHolder) &&
        !string.IsNullOrWhiteSpace(_webhookApiKey) &&
        Regex.IsMatch(
            _paymentPrefix,
            "^[A-Z]{2,5}$",
            RegexOptions.CultureInvariant);

    public SePayPaymentGateway(IOptions<SePayOptions> options)
    {
        var value = options.Value;

        BankCode = (value.BankCode ?? "TPBank").Trim();
        AccountNumber = NormalizeAccountNumber(value.AccountNumber);
        AccountHolder = (value.AccountHolder ?? string.Empty).Trim();
        _webhookApiKey = (value.WebhookApiKey ?? string.Empty).Trim();
        _paymentPrefix = (value.PaymentPrefix ?? "DH")
            .Trim()
            .ToUpperInvariant();

        _paymentCodeRegex = new Regex(
            $@"(?<![A-Z0-9])({Regex.Escape(_paymentPrefix)}\d{{7}})(?!\d)",
            RegexOptions.Compiled |
            RegexOptions.CultureInvariant |
            RegexOptions.IgnoreCase);
    }

    public PaymentInstruction CreatePaymentInstruction(
        long providerOrderCode,
        int amount)
    {
        EnsureConfigured();

        if (providerOrderCode is < 1_000_000 or > 9_999_999)
            throw new ArgumentOutOfRangeException(nameof(providerOrderCode));

        if (amount <= 0)
            throw new ArgumentOutOfRangeException(nameof(amount));

        var paymentCode = GetPaymentCode(providerOrderCode);
        var imagePath = string.Join('-', new[]
        {
            Encode(BankCode),
            Encode(AccountNumber),
            "compact2.png"
        });
        var query = string.Join('&', new[]
        {
            $"amount={amount.ToString(CultureInfo.InvariantCulture)}",
            $"addInfo={Encode(paymentCode)}",
            $"accountName={Encode(AccountHolder)}"
        });

        return new PaymentInstruction(
            paymentCode,
            $"https://img.vietqr.io/image/{imagePath}?{query}",
            BankCode,
            AccountNumber,
            AccountHolder);
    }

    public bool IsWebhookAuthorized(string? authorizationHeader)
    {
        if (string.IsNullOrWhiteSpace(_webhookApiKey) ||
            string.IsNullOrWhiteSpace(authorizationHeader))
        {
            return false;
        }

        const string prefix = "Apikey ";
        if (!authorizationHeader.StartsWith(
                prefix,
                StringComparison.OrdinalIgnoreCase))
        {
            return false;
        }

        var suppliedKey = authorizationHeader[prefix.Length..].Trim();
        var expectedBytes = Encoding.UTF8.GetBytes(_webhookApiKey);
        var suppliedBytes = Encoding.UTF8.GetBytes(suppliedKey);

        return expectedBytes.Length == suppliedBytes.Length &&
               CryptographicOperations.FixedTimeEquals(
                   expectedBytes,
                   suppliedBytes);
    }

    public bool IsExpectedAccount(string? accountNumber)
        => !string.IsNullOrWhiteSpace(AccountNumber) &&
           string.Equals(
               NormalizeAccountNumber(accountNumber),
               AccountNumber,
               StringComparison.Ordinal);

    public string? ExtractPaymentCode(
        string? directCode,
        string? content,
        string? description)
    {
        var normalizedDirectCode = NormalizeDirectPaymentCode(directCode);
        if (normalizedDirectCode != null)
            return normalizedDirectCode;

        foreach (var candidate in new[] { content, description })
        {
            if (string.IsNullOrWhiteSpace(candidate))
                continue;

            var match = _paymentCodeRegex.Match(candidate);
            if (match.Success)
                return match.Groups[1].Value.ToUpperInvariant();
        }

        return null;
    }

    public DateTime? ParseTransactionUtc(string? transactionDate)
    {
        if (!DateTime.TryParseExact(
                transactionDate?.Trim(),
                "yyyy-MM-dd HH:mm:ss",
                CultureInfo.InvariantCulture,
                DateTimeStyles.AllowWhiteSpaces,
                out var vietnamLocalTime))
        {
            return null;
        }

        return new DateTimeOffset(
                DateTime.SpecifyKind(
                    vietnamLocalTime,
                    DateTimeKind.Unspecified),
                VietnamUtcOffset)
            .UtcDateTime;
    }

    private string GetPaymentCode(long providerOrderCode)
        => $"{_paymentPrefix}{providerOrderCode:D7}";

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
