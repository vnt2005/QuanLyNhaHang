namespace QuanLyNhaHang.Domain.Entities;

public class InvoiceItem
{
    public Guid Id { get; private set; }

    public Guid InvoiceId { get; private set; }

    public Guid OrderItemId { get; private set; }

    public Guid MenuItemId { get; private set; }

    public string MenuItemName { get; private set; } = string.Empty;

    public int Quantity { get; private set; }

    public decimal UnitPrice { get; private set; }

    public decimal TotalPrice { get; private set; }

    public string? Note { get; private set; }

    public DateTime CreatedAt { get; private set; }

    protected InvoiceItem()
    {
    }

    public InvoiceItem(
        Guid invoiceId,
        Guid orderItemId,
        Guid menuItemId,
        string menuItemName,
        int quantity,
        decimal unitPrice,
        decimal totalPrice,
        string? note)
    {
        Id = Guid.NewGuid();

        SetInvoiceId(invoiceId);
        SetOrderItemId(orderItemId);
        SetMenuItemId(menuItemId);
        SetMenuItemName(menuItemName);
        SetQuantity(quantity);
        SetUnitPrice(unitPrice);
        SetTotalPrice(totalPrice);
        SetNote(note);

        CreatedAt = DateTime.UtcNow;
    }

    private void SetInvoiceId(Guid invoiceId)
    {
        if (invoiceId == Guid.Empty)
            throw new ArgumentException("Hóa đơn không hợp lệ.");

        InvoiceId = invoiceId;
    }

    private void SetOrderItemId(Guid orderItemId)
    {
        if (orderItemId == Guid.Empty)
            throw new ArgumentException("Món trong order không hợp lệ.");

        OrderItemId = orderItemId;
    }

    private void SetMenuItemId(Guid menuItemId)
    {
        if (menuItemId == Guid.Empty)
            throw new ArgumentException("Món ăn không hợp lệ.");

        MenuItemId = menuItemId;
    }

    private void SetMenuItemName(string menuItemName)
    {
        if (string.IsNullOrWhiteSpace(menuItemName))
            throw new ArgumentException("Tên món ăn không được để trống.");

        MenuItemName = menuItemName.Trim();
    }

    private void SetQuantity(int quantity)
    {
        if (quantity <= 0)
            throw new ArgumentException("Số lượng món phải lớn hơn 0.");

        Quantity = quantity;
    }

    private void SetUnitPrice(decimal unitPrice)
    {
        if (unitPrice < 0)
            throw new ArgumentException("Đơn giá không được nhỏ hơn 0.");

        UnitPrice = unitPrice;
    }

    private void SetTotalPrice(decimal totalPrice)
    {
        if (totalPrice < 0)
            throw new ArgumentException("Thành tiền không được nhỏ hơn 0.");

        TotalPrice = totalPrice;
    }

    private void SetNote(string? note)
    {
        Note = string.IsNullOrWhiteSpace(note)
            ? null
            : note.Trim();
    }
}