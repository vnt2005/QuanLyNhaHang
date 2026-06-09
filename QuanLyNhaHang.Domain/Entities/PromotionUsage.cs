namespace QuanLyNhaHang.Domain.Entities;

public class PromotionUsage
{
    public Guid Id { get; private set; }

    public Guid PromotionId { get; private set; }

    public Guid OrderId { get; private set; }

    public Guid? PaymentId { get; private set; }

    public string PromotionCode { get; private set; } = string.Empty;

    public decimal OrderAmount { get; private set; }

    public decimal DiscountAmount { get; private set; }

    public string Status { get; private set; } = string.Empty;

    public string? Note { get; private set; }

    public DateTime UsedAt { get; private set; }

    public DateTime? CancelledAt { get; private set; }

    protected PromotionUsage()
    {
    }

    public PromotionUsage(
        Guid promotionId,
        Guid orderId,
        Guid? paymentId,
        string promotionCode,
        decimal orderAmount,
        decimal discountAmount,
        string? note)
    {
        Id = Guid.NewGuid();

        SetPromotionId(promotionId);
        SetOrderId(orderId);
        SetPaymentId(paymentId);
        SetPromotionCode(promotionCode);
        SetOrderAmount(orderAmount);
        SetDiscountAmount(discountAmount);
        SetNote(note);

        Status = "Applied";
        UsedAt = DateTime.UtcNow;
    }

    public void SetPayment(Guid paymentId)
    {
        SetPaymentId(paymentId);
    }

    public void Cancel()
    {
        if (Status == "Cancelled")
            throw new InvalidOperationException("Lượt sử dụng khuyến mãi đã được hủy trước đó.");

        Status = "Cancelled";
        CancelledAt = DateTime.UtcNow;
    }

    private void SetPromotionId(Guid promotionId)
    {
        if (promotionId == Guid.Empty)
            throw new ArgumentException("Khuyến mãi không hợp lệ.");

        PromotionId = promotionId;
    }

    private void SetOrderId(Guid orderId)
    {
        if (orderId == Guid.Empty)
            throw new ArgumentException("Order không hợp lệ.");

        OrderId = orderId;
    }

    private void SetPaymentId(Guid? paymentId)
    {
        if (paymentId.HasValue && paymentId.Value == Guid.Empty)
            throw new ArgumentException("Thanh toán không hợp lệ.");

        PaymentId = paymentId;
    }

    private void SetPromotionCode(string promotionCode)
    {
        if (string.IsNullOrWhiteSpace(promotionCode))
            throw new ArgumentException("Mã khuyến mãi không được để trống.");

        PromotionCode = promotionCode.Trim().ToUpper();
    }

    private void SetOrderAmount(decimal orderAmount)
    {
        if (orderAmount < 0)
            throw new ArgumentException("Giá trị đơn hàng không được nhỏ hơn 0.");

        OrderAmount = orderAmount;
    }

    private void SetDiscountAmount(decimal discountAmount)
    {
        if (discountAmount < 0)
            throw new ArgumentException("Số tiền giảm giá không được nhỏ hơn 0.");

        DiscountAmount = discountAmount;
    }

    private void SetNote(string? note)
    {
        Note = string.IsNullOrWhiteSpace(note)
            ? null
            : note.Trim();
    }
}