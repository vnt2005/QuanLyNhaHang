namespace QuanLyNhaHang.Domain.Payments;

public sealed record PaymentMethodDefinition(
    string Code,
    string DisplayName,
    string Description,
    bool AvailableAtCounter,
    bool AvailableOnCustomerWeb);

/// <summary>
/// Authoritative payment-method catalog shared by domain validation and
/// read-only consumers such as the AI assistant.
/// </summary>
public static class PaymentMethodCatalog
{
    public const string Cash = "Cash";
    public const string Card = "Card";
    public const string BankTransfer = "BankTransfer";
    public const string EWallet = "EWallet";
    public const string Momo = "Momo";
    public const string ZaloPay = "ZaloPay";
    public const string Other = "Other";

    public static IReadOnlyList<PaymentMethodDefinition> All { get; } =
        Array.AsReadOnly(
        new PaymentMethodDefinition[]
        {
            new(
                BankTransfer,
                "Chuyển khoản QR/ngân hàng",
                "Khách có thể quét QR trên CustomerWeb; giao dịch online được SePay đối soát.",
                AvailableAtCounter: true,
                AvailableOnCustomerWeb: true),
            new(
                Cash,
                "Tiền mặt",
                "Thu ngân ghi nhận thanh toán trực tiếp tại quầy.",
                AvailableAtCounter: true,
                AvailableOnCustomerWeb: false),
            new(
                Card,
                "Thẻ",
                "Thu ngân ghi nhận thanh toán thẻ tại quầy.",
                AvailableAtCounter: true,
                AvailableOnCustomerWeb: false),
            new(
                EWallet,
                "Ví điện tử",
                "Thu ngân ghi nhận một ví điện tử không thuộc lựa chọn chuyên biệt.",
                AvailableAtCounter: true,
                AvailableOnCustomerWeb: false),
            new(
                Momo,
                "MoMo",
                "Thu ngân ghi nhận thanh toán MoMo tại quầy.",
                AvailableAtCounter: true,
                AvailableOnCustomerWeb: false),
            new(
                ZaloPay,
                "ZaloPay",
                "Thu ngân ghi nhận thanh toán ZaloPay tại quầy.",
                AvailableAtCounter: true,
                AvailableOnCustomerWeb: false),
            new(
                Other,
                "Khác",
                "Phương thức khác do thu ngân xác nhận và ghi chú tại quầy.",
                AvailableAtCounter: true,
                AvailableOnCustomerWeb: false)
        });

    public static bool IsSupported(string? code)
    {
        if (string.IsNullOrWhiteSpace(code))
            return false;

        return All.Any(method => method.Code.Equals(
            code.Trim(),
            StringComparison.Ordinal));
    }
}
