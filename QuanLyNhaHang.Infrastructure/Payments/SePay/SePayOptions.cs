namespace QuanLyNhaHang.Infrastructure.Payments.SePay;

public sealed class SePayOptions
{
    public const string SectionName = "SePay";

    public string BankCode { get; set; } = "TPBank";
    public string AccountNumber { get; set; } = string.Empty;
    public string AccountHolder { get; set; } = string.Empty;
    public string WebhookApiKey { get; set; } = string.Empty;
    public string PaymentPrefix { get; set; } = "DH";
    public bool? RequireWebhookReadiness { get; set; }
    public int? WebhookHeartbeatTimeoutSeconds { get; set; }
}
