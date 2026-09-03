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
                "Chỉ được ghi nhận Paid từ giao dịch online đã được SePay/webhook đối soát; nhân viên không được tự khai báo tại quầy.",
                AvailableAtCounter: false,
                AvailableOnCustomerWeb: true),
            new(
                Cash,
                "Tiền mặt",
                "Thu ngân ghi nhận thanh toán trực tiếp tại quầy và phải để lại lý do kiểm toán.",
                AvailableAtCounter: true,
                AvailableOnCustomerWeb: false),
            new(
                Card,
                "Thẻ",
                "Thu ngân ghi nhận thanh toán thẻ tại quầy và phải để lại lý do/thông tin đối chiếu.",
                AvailableAtCounter: true,
                AvailableOnCustomerWeb: false),
            new(
                EWallet,
                "Ví điện tử",
                "Thu ngân ghi nhận ví điện tử tại quầy và phải để lại lý do/thông tin đối chiếu.",
                AvailableAtCounter: true,
                AvailableOnCustomerWeb: false),
            new(
                Momo,
                "MoMo",
                "Thu ngân ghi nhận MoMo tại quầy và phải để lại lý do/thông tin đối chiếu.",
                AvailableAtCounter: true,
                AvailableOnCustomerWeb: false),
            new(
                ZaloPay,
                "ZaloPay",
                "Thu ngân ghi nhận ZaloPay tại quầy và phải để lại lý do/thông tin đối chiếu.",
                AvailableAtCounter: true,
                AvailableOnCustomerWeb: false),
            new(
                Other,
                "Khác",
                "Phương thức khác do thu ngân xác nhận tại quầy; bắt buộc ghi rõ lý do và dữ liệu liên quan.",
                AvailableAtCounter: true,
                AvailableOnCustomerWeb: false)
        });

    public static bool IsSupported(string? code)
        => Find(code) != null;

    public static bool IsAvailableAtCounter(string? code)
        => Find(code)?.AvailableAtCounter == true;

    public static bool IsAvailableOnCustomerWeb(string? code)
        => Find(code)?.AvailableOnCustomerWeb == true;

    public static PaymentMethodDefinition? Find(string? code)
    {
        if (string.IsNullOrWhiteSpace(code))
            return null;

        var normalized = code.Trim();
        return All.FirstOrDefault(method => method.Code.Equals(
            normalized,
            StringComparison.Ordinal));
    }
}
