using System.Globalization;
using System.Security.Cryptography;
using System.Text;
using System.Text.RegularExpressions;
using Microsoft.Extensions.Options;
using QuanLyNhaHang.Application.Common.Payments;

namespace QuanLyNhaHang.Infrastructure.Payments.SePay;

public sealed class SePayWebhookParser : IPaymentWebhookAdapter
{
    private static readonly TimeSpan VietnamUtcOffset = TimeSpan.FromHours(7);

    private readonly string _accountNumber;
    private readonly string _webhookApiKey;
    private readonly Regex _paymentCodeRegex;

    public string DefaultGateway { get; }

    public SePayWebhookParser(IOptions<SePayOptions> options)
    {
        var value = options.Value;
        DefaultGateway = (value.BankCode ?? "TPBank").Trim();
        _accountNumber = NormalizeAccountNumber(value.AccountNumber);
        _webhookApiKey = (value.WebhookApiKey ?? string.Empty).Trim();

        var paymentPrefix = (value.PaymentPrefix ?? "DH")
            .Trim()
            .ToUpperInvariant();

        _paymentCodeRegex = new Regex(
            $@"(?<![A-Z0-9])({Regex.Escape(paymentPrefix)}\d{{7}})(?!\d)",
            RegexOptions.Compiled |
            RegexOptions.CultureInvariant |
            RegexOptions.IgnoreCase);
    }

    public bool IsAuthorized(string? authorizationHeader)
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
        => !string.IsNullOrWhiteSpace(_accountNumber) &&
           string.Equals(
               NormalizeAccountNumber(accountNumber),
               _accountNumber,
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
}
