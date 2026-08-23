namespace QuanLyNhaHang.Api.Contracts.Payments;

public sealed class SePayWebhookRequest
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
