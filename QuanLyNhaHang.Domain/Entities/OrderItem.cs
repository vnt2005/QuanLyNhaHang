namespace QuanLyNhaHang.Domain.Entities;

public class OrderItem
{
    public Guid Id { get; private set; }

    public Guid OrderId { get; private set; }

    public Guid MenuItemId { get; private set; }

    public string MenuItemName { get; private set; } = string.Empty;

    public int Quantity { get; private set; }

    public decimal UnitPrice { get; private set; }

    public decimal TotalPrice { get; private set; }

    public string Status { get; private set; } = string.Empty;

    public string? Note { get; private set; }

    public DateTime CreatedAt { get; private set; }

    public DateTime? UpdatedAt { get; private set; }

    protected OrderItem()
    {
    }

    public OrderItem(
        Guid orderId,
        Guid menuItemId,
        string menuItemName,
        int quantity,
        decimal unitPrice,
        string? note)
    {
        Id = Guid.NewGuid();

        SetOrderId(orderId);
        SetMenuItemId(menuItemId);
        SetMenuItemName(menuItemName);
        SetQuantity(quantity);
        SetUnitPrice(unitPrice);
        SetNote(note);

        TotalPrice = Quantity * UnitPrice;
        Status = "Pending";
        CreatedAt = DateTime.UtcNow;
    }

    public void UpdateQuantity(int quantity)
    {
        SetQuantity(quantity);

        TotalPrice = Quantity * UnitPrice;
        UpdatedAt = DateTime.UtcNow;
    }

    public void MarkPending()
    {
        Status = "Pending";
        UpdatedAt = DateTime.UtcNow;
    }

    public void MarkCooking()
    {
        Status = "Cooking";
        UpdatedAt = DateTime.UtcNow;
    }

    public void MarkServed()
    {
        Status = "Served";
        UpdatedAt = DateTime.UtcNow;
    }

    public void Cancel()
    {
        Status = "Cancelled";
        UpdatedAt = DateTime.UtcNow;
    }

    private void SetOrderId(Guid orderId)
    {
        if (orderId == Guid.Empty)
            throw new ArgumentException("Order không hợp lệ.");

        OrderId = orderId;
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

    private void SetNote(string? note)
    {
        Note = string.IsNullOrWhiteSpace(note)
            ? null
            : note.Trim();
    }
}