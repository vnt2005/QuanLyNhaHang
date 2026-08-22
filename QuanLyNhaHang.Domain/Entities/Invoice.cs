namespace QuanLyNhaHang.Domain.Entities;

public class Invoice
{
    public Guid Id { get; private set; }

    public Guid OrderId { get; private set; }

    public Guid PaymentId { get; private set; }

    public Guid? RestaurantTableId { get; private set; }

    public string InvoiceCode { get; private set; } = string.Empty;

    public string OrderCode { get; private set; } = string.Empty;

    public string PaymentCode { get; private set; } = string.Empty;

    public string RestaurantTableName { get; private set; } = string.Empty;

    public decimal TotalAmount { get; private set; }

    public decimal DiscountAmount { get; private set; }

    public decimal ServiceChargeAmount =>
        FinalAmount - TotalAmount + DiscountAmount - VatAmount;

    public decimal VatAmount { get; private set; }

    public decimal FinalAmount { get; private set; }

    public decimal CustomerPaid { get; private set; }

    public decimal ChangeAmount { get; private set; }

    public string PaymentMethod { get; private set; } = string.Empty;

    public string Status { get; private set; } = string.Empty;

    public string? Note { get; private set; }

    public DateTime IssuedAt { get; private set; }

    public DateTime CreatedAt { get; private set; }

    public DateTime? UpdatedAt { get; private set; }

    protected Invoice()
    {
    }

    public Invoice(
        Guid orderId,
        Guid paymentId,
        Guid? restaurantTableId,
        string orderCode,
        string paymentCode,
        string restaurantTableName,
        decimal totalAmount,
        decimal discountAmount,
        decimal vatAmount,
        decimal finalAmount,
        decimal customerPaid,
        decimal changeAmount,
        string paymentMethod,
        string? note)
    {
        Id = Guid.NewGuid();

        SetOrderId(orderId);
        SetPaymentId(paymentId);
        SetRestaurantTableId(restaurantTableId);
        SetOrderCode(orderCode);
        SetPaymentCode(paymentCode);
        SetRestaurantTableName(restaurantTableName);
        SetAmounts(totalAmount, discountAmount, vatAmount, finalAmount, customerPaid, changeAmount);
        SetPaymentMethod(paymentMethod);
        SetNote(note);

        InvoiceCode = GenerateInvoiceCode();
        Status = "Issued";
        IssuedAt = DateTime.UtcNow;
        CreatedAt = DateTime.UtcNow;
    }

    public void UpdateNote(string? note)
    {
        if (Status == "Cancelled")
            throw new InvalidOperationException("Hóa đơn đã hủy, không thể cập nhật.");

        SetNote(note);
        UpdatedAt = DateTime.UtcNow;
    }

    public void UpdatePaymentSnapshot(
        decimal totalAmount,
        decimal discountAmount,
        decimal vatAmount,
        decimal finalAmount,
        decimal customerPaid,
        decimal changeAmount,
        string paymentMethod)
    {
        if (Status == "Cancelled")
            throw new InvalidOperationException("Hóa đơn đã hủy, không thể cập nhật thanh toán.");

        SetAmounts(
            totalAmount,
            discountAmount,
            vatAmount,
            finalAmount,
            customerPaid,
            changeAmount);
        SetPaymentMethod(paymentMethod);
        UpdatedAt = DateTime.UtcNow;
    }

    public void MarkPrinted()
    {
        if (Status == "Cancelled")
            throw new InvalidOperationException("Hóa đơn đã hủy, không thể in.");

        Status = "Printed";
        UpdatedAt = DateTime.UtcNow;
    }

    public void Cancel()
    {
        if (Status == "Cancelled")
            throw new InvalidOperationException("Hóa đơn đã được hủy trước đó.");

        Status = "Cancelled";
        UpdatedAt = DateTime.UtcNow;
    }

    private void SetOrderId(Guid orderId)
    {
        if (orderId == Guid.Empty)
            throw new ArgumentException("Order không hợp lệ.");

        OrderId = orderId;
    }

    private void SetPaymentId(Guid paymentId)
    {
        if (paymentId == Guid.Empty)
            throw new ArgumentException("Thanh toán không hợp lệ.");

        PaymentId = paymentId;
    }

    private void SetRestaurantTableId(Guid? restaurantTableId)
    {
        if (restaurantTableId == Guid.Empty)
            throw new ArgumentException("Bàn không hợp lệ.");

        RestaurantTableId = restaurantTableId;
    }

    private void SetOrderCode(string orderCode)
    {
        if (string.IsNullOrWhiteSpace(orderCode))
            throw new ArgumentException("Mã order không được để trống.");

        OrderCode = orderCode.Trim();
    }

    private void SetPaymentCode(string paymentCode)
    {
        if (string.IsNullOrWhiteSpace(paymentCode))
            throw new ArgumentException("Mã thanh toán không được để trống.");

        PaymentCode = paymentCode.Trim();
    }

    private void SetRestaurantTableName(string restaurantTableName)
    {
        if (string.IsNullOrWhiteSpace(restaurantTableName))
            throw new ArgumentException("Tên bàn không được để trống.");

        RestaurantTableName = restaurantTableName.Trim();
    }

    private void SetAmounts(
        decimal totalAmount,
        decimal discountAmount,
        decimal vatAmount,
        decimal finalAmount,
        decimal customerPaid,
        decimal changeAmount)
    {
        if (totalAmount < 0)
            throw new ArgumentException("Tổng tiền không được nhỏ hơn 0.");

        if (discountAmount < 0)
            throw new ArgumentException("Tiền giảm giá không được nhỏ hơn 0.");

        if (vatAmount < 0)
            throw new ArgumentException("Tiền VAT không được nhỏ hơn 0.");

        if (finalAmount < 0)
            throw new ArgumentException("Thành tiền không được nhỏ hơn 0.");

        if (customerPaid < finalAmount)
            throw new ArgumentException("Tiền khách đưa không đủ.");

        TotalAmount = totalAmount;
        DiscountAmount = discountAmount;
        VatAmount = vatAmount;
        FinalAmount = finalAmount;
        CustomerPaid = customerPaid;
        ChangeAmount = changeAmount;
    }

    private void SetPaymentMethod(string paymentMethod)
    {
        if (string.IsNullOrWhiteSpace(paymentMethod))
            throw new ArgumentException("Phương thức thanh toán không được để trống.");

        PaymentMethod = paymentMethod.Trim();
    }

    private void SetNote(string? note)
    {
        Note = string.IsNullOrWhiteSpace(note)
            ? null
            : note.Trim();
    }

    private static string GenerateInvoiceCode()
    {
        return $"INV-{DateTime.UtcNow:yyyyMMddHHmmssfff}";
    }
}