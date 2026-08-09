namespace QuanLyNhaHang.Domain.Entities;

public class Payment
{
    public Guid Id { get; private set; }

    public Guid OrderId { get; private set; }

    public string PaymentCode { get; private set; } = string.Empty;

    public decimal TotalAmount { get; private set; }

    public decimal DiscountAmount { get; private set; }

    public decimal VatAmount { get; private set; }

    public decimal FinalAmount { get; private set; }

    public decimal CustomerPaid { get; private set; }

    public decimal ChangeAmount { get; private set; }

    public string PaymentMethod { get; private set; } = string.Empty;

    public string Status { get; private set; } = string.Empty;

    public string? Note { get; private set; }

    public DateTime PaidAt { get; private set; }

    public DateTime CreatedAt { get; private set; }

    public DateTime? UpdatedAt { get; private set; }

    protected Payment()
    {
    }

    public Payment(
        Guid orderId,
        decimal totalAmount,
        decimal discountAmount,
        decimal vatAmount,
        decimal customerPaid,
        string paymentMethod,
        string? note)
    {
        Id = Guid.NewGuid();

        SetOrderId(orderId);
        SetTotalAmount(totalAmount);
        SetDiscountAmount(discountAmount);
        SetVatAmount(vatAmount);
        SetPaymentMethod(paymentMethod);
        SetNote(note);

        FinalAmount = TotalAmount - DiscountAmount + VatAmount;

        EnsurePositiveFinalAmount();

        SetCustomerPaid(customerPaid);

        ChangeAmount = CustomerPaid - FinalAmount;

        PaymentCode = GeneratePaymentCode();
        Status = "Paid";
        PaidAt = DateTime.UtcNow;
        CreatedAt = DateTime.UtcNow;
    }

    public void UpdateInfo(
        decimal discountAmount,
        decimal vatAmount,
        decimal customerPaid,
        string paymentMethod,
        string? note)
    {
        SetDiscountAmount(discountAmount);
        SetVatAmount(vatAmount);
        SetPaymentMethod(paymentMethod);
        SetNote(note);

        FinalAmount = TotalAmount - DiscountAmount + VatAmount;

        EnsurePositiveFinalAmount();

        SetCustomerPaid(customerPaid);

        ChangeAmount = CustomerPaid - FinalAmount;
        UpdatedAt = DateTime.UtcNow;
    }

    public void Cancel()
    {
        if (Status == "Cancelled")
            throw new InvalidOperationException("Thanh toán đã bị hủy.");

        Status = "Cancelled";
        UpdatedAt = DateTime.UtcNow;
    }

    private void SetOrderId(Guid orderId)
    {
        if (orderId == Guid.Empty)
            throw new ArgumentException("Order không hợp lệ.");

        OrderId = orderId;
    }

    private void SetTotalAmount(decimal totalAmount)
    {
        if (totalAmount < 0)
            throw new ArgumentException("Tổng tiền không được nhỏ hơn 0.");

        TotalAmount = totalAmount;
    }

    private void SetDiscountAmount(decimal discountAmount)
    {
        if (discountAmount < 0)
            throw new ArgumentException("Tiền giảm giá không được nhỏ hơn 0.");

        if (discountAmount > TotalAmount)
            throw new ArgumentException("Tiền giảm giá không được lớn hơn tổng tiền.");

        DiscountAmount = discountAmount;
    }

    private void SetVatAmount(decimal vatAmount)
    {
        if (vatAmount < 0)
            throw new ArgumentException("Tiền VAT không được nhỏ hơn 0.");

        VatAmount = vatAmount;
    }

    private void EnsurePositiveFinalAmount()
    {
        if (FinalAmount <= 0)
            throw new ArgumentException("Số tiền thanh toán phải lớn hơn 0.");
    }

    private void SetCustomerPaid(decimal customerPaid)
    {
        if (customerPaid < FinalAmount)
            throw new ArgumentException("Số tiền khách đưa không đủ để thanh toán.");

        CustomerPaid = customerPaid;
    }

    private void SetPaymentMethod(string paymentMethod)
    {
        if (string.IsNullOrWhiteSpace(paymentMethod))
            throw new ArgumentException("Phương thức thanh toán không được để trống.");

        paymentMethod = paymentMethod.Trim();

        var validMethods = new[] { "Cash", "Card", "BankTransfer", "EWallet", "Momo", "ZaloPay", "Other" };

        if (!validMethods.Contains(paymentMethod))
            throw new ArgumentException("Phương thức thanh toán không hợp lệ.");

        PaymentMethod = paymentMethod;
    }

    private void SetNote(string? note)
    {
        Note = string.IsNullOrWhiteSpace(note)
            ? null
            : note.Trim();
    }

    private static string GeneratePaymentCode()
    {
        return $"PAY-{DateTime.UtcNow:yyyyMMddHHmmssfff}";
    }
}