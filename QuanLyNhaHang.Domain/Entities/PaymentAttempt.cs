namespace QuanLyNhaHang.Domain.Entities;

public class PaymentAttempt
{
    public const string CreatingStatus = "Creating";
    public const string PendingStatus = "Pending";
    public const string PaidStatus = "Paid";
    public const string CancelledStatus = "Cancelled";
    public const string ExpiredStatus = "Expired";
    public const string FailedStatus = "Failed";
    public const string RequiresReviewStatus = "RequiresReview";

    public Guid Id { get; private set; }

    public Guid OrderId { get; private set; }

    public Guid? PaymentId { get; private set; }

    public string Provider { get; private set; } = string.Empty;

    public long ProviderOrderCode { get; private set; }

    public string? ProviderPaymentLinkId { get; private set; }

    public string? ProviderReference { get; private set; }

    public string? ProviderStatus { get; private set; }

    public decimal Amount { get; private set; }

    public decimal? ReceivedAmount { get; private set; }

    public string Status { get; private set; } = string.Empty;

    public string? CheckoutUrl { get; private set; }

    public string? ReviewReason { get; private set; }

    public DateTime ExpiresAt { get; private set; }

    public DateTime CreatedAt { get; private set; }

    public DateTime? UpdatedAt { get; private set; }

    public DateTime? PaidAt { get; private set; }

    protected PaymentAttempt()
    {
    }

    public PaymentAttempt(
        Guid orderId,
        string provider,
        long providerOrderCode,
        decimal amount,
        DateTime expiresAt)
    {
        if (orderId == Guid.Empty)
            throw new ArgumentException("Order không hợp lệ.", nameof(orderId));

        if (string.IsNullOrWhiteSpace(provider))
            throw new ArgumentException("Nhà cung cấp thanh toán không được để trống.", nameof(provider));

        if (providerOrderCode <= 0)
            throw new ArgumentException("Mã giao dịch nhà cung cấp không hợp lệ.", nameof(providerOrderCode));

        if (amount <= 0)
            throw new ArgumentException("Số tiền thanh toán phải lớn hơn 0.", nameof(amount));

        var now = DateTime.UtcNow;
        if (expiresAt <= now)
            throw new ArgumentException("Thời gian hết hạn phải nằm trong tương lai.", nameof(expiresAt));

        Id = Guid.NewGuid();
        OrderId = orderId;
        Provider = provider.Trim();
        ProviderOrderCode = providerOrderCode;
        Amount = amount;
        Status = CreatingStatus;
        ExpiresAt = expiresAt;
        CreatedAt = now;
    }

    public void AttachPaymentLink(
        string paymentLinkId,
        string checkoutUrl,
        string? providerStatus)
    {
        if (string.IsNullOrWhiteSpace(paymentLinkId))
            throw new ArgumentException("Payment link id không được để trống.", nameof(paymentLinkId));

        if (!Uri.TryCreate(checkoutUrl, UriKind.Absolute, out _))
            throw new ArgumentException("Checkout URL không hợp lệ.", nameof(checkoutUrl));

        ProviderPaymentLinkId = paymentLinkId.Trim();
        CheckoutUrl = checkoutUrl.Trim();
        ProviderStatus = Normalize(providerStatus);
        Status = PendingStatus;
        ReviewReason = null;
        UpdatedAt = DateTime.UtcNow;
    }

    public void MarkPaid(
        Guid paymentId,
        decimal receivedAmount,
        string? providerReference,
        string? providerStatus = "PAID")
    {
        if (paymentId == Guid.Empty)
            throw new ArgumentException("Payment không hợp lệ.", nameof(paymentId));

        if (receivedAmount <= 0)
            throw new ArgumentException("Số tiền nhận được phải lớn hơn 0.", nameof(receivedAmount));

        PaymentId = paymentId;
        ReceivedAmount = receivedAmount;
        ProviderReference = Normalize(providerReference);
        ProviderStatus = Normalize(providerStatus);
        Status = PaidStatus;
        ReviewReason = null;
        PaidAt = DateTime.UtcNow;
        UpdatedAt = PaidAt;
    }

    public void MarkRequiresReview(
        decimal receivedAmount,
        string? providerReference,
        string reason,
        string? providerStatus = "PAID")
    {
        if (receivedAmount <= 0)
            throw new ArgumentException("Số tiền nhận được phải lớn hơn 0.", nameof(receivedAmount));

        if (string.IsNullOrWhiteSpace(reason))
            throw new ArgumentException("Lý do đối soát không được để trống.", nameof(reason));

        ReceivedAmount = receivedAmount;
        ProviderReference = Normalize(providerReference);
        ProviderStatus = Normalize(providerStatus);
        Status = RequiresReviewStatus;
        ReviewReason = reason.Trim();
        PaidAt ??= DateTime.UtcNow;
        UpdatedAt = DateTime.UtcNow;
    }

    public void MarkExpired()
    {
        if (Status == PaidStatus || Status == RequiresReviewStatus)
            return;

        Status = ExpiredStatus;
        ProviderStatus = "EXPIRED";
        UpdatedAt = DateTime.UtcNow;
    }

    public void MarkCancelled(string? reason = null)
    {
        if (Status == PaidStatus || Status == RequiresReviewStatus)
            return;

        Status = CancelledStatus;
        ProviderStatus = "CANCELLED";
        ReviewReason = Normalize(reason);
        UpdatedAt = DateTime.UtcNow;
    }

    public void MarkFailed(string reason)
    {
        if (string.IsNullOrWhiteSpace(reason))
            throw new ArgumentException("Lý do lỗi không được để trống.", nameof(reason));

        if (Status == PaidStatus || Status == RequiresReviewStatus)
            return;

        Status = FailedStatus;
        ReviewReason = reason.Trim();
        UpdatedAt = DateTime.UtcNow;
    }

    private static string? Normalize(string? value)
        => string.IsNullOrWhiteSpace(value) ? null : value.Trim();
}
