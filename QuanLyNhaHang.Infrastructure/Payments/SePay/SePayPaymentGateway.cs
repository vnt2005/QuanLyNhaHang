using System.Globalization;
using System.Text.RegularExpressions;
using Microsoft.Extensions.Options;
using QuanLyNhaHang.Application.Common.Payments;

namespace QuanLyNhaHang.Infrastructure.Payments.SePay;

public sealed class SePayPaymentGateway : IPaymentGateway
{
    private readonly string _webhookApiKey;
    private readonly string _paymentPrefix;

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

    private static string NormalizeAccountNumber(string? value)
        => string.IsNullOrWhiteSpace(value)
            ? string.Empty
            : string.Concat(value.Where(char.IsLetterOrDigit));

    private static string Encode(string value)
        => Uri.EscapeDataString(value);
}
