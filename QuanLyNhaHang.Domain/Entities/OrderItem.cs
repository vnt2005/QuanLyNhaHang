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

    public byte[] RowVersion { get; private set; } = [];

    public DateTime? StartedAt { get; private set; }

    public DateTime? CompletedAt { get; private set; }

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
        if (Status == "Cancelled")
            throw new InvalidOperationException("Món đã hủy, không thể cập nhật số lượng.");

        if (Status == "Served")
            throw new InvalidOperationException("Món đã phục vụ, không thể cập nhật số lượng.");

        SetQuantity(quantity);

        TotalPrice = Quantity * UnitPrice;
        UpdatedAt = DateTime.UtcNow;
    }

    public void UpdateNote(string? note)
    {
        SetNote(note);
        UpdatedAt = DateTime.UtcNow;
    }

    public void MarkPending()
    {
        if (Status == "Served")
            throw new InvalidOperationException("Món đã phục vụ, không thể chuyển về chờ xử lý.");

        Status = "Pending";
        UpdatedAt = DateTime.UtcNow;
    }

    public void MarkCooking()
    {
        if (Status == "Cancelled")
            throw new InvalidOperationException("Món đã hủy, không thể bắt đầu nấu.");

        if (Status == "Ready")
            throw new InvalidOperationException("Món đã hoàn thành, không thể chuyển sang đang nấu.");

        if (Status == "Served")
            throw new InvalidOperationException("Món đã phục vụ, không thể bắt đầu nấu.");

        Status = "Cooking";
        StartedAt ??= DateTime.UtcNow;
        UpdatedAt = DateTime.UtcNow;
    }

    public void MarkReady()
    {
        if (Status == "Cancelled")
            throw new InvalidOperationException("Món đã hủy, không thể hoàn thành.");

        if (Status == "Served")
            throw new InvalidOperationException("Món đã phục vụ.");

        Status = "Ready";
        CompletedAt = DateTime.UtcNow;
        UpdatedAt = DateTime.UtcNow;
    }

    public void MarkServed()
    {
        if (Status != "Ready")
            throw new InvalidOperationException("Chỉ món đã hoàn thành mới được phục vụ.");

        Status = "Served";
        UpdatedAt = DateTime.UtcNow;
    }

    public void Cancel()
    {
        if (Status == "Served")
            throw new InvalidOperationException("Món đã phục vụ, không thể hủy.");

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
        if (quantity is <= 0 or > 99)
        {
            throw new ArgumentException(
                "Số lượng mỗi món phải từ 1 đến 99.");
        }

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

    public void ChangeOrder(Guid orderId)
    {
        SetOrderId(orderId);
        UpdatedAt = DateTime.UtcNow;
    }

    public void DecreaseQuantity(int quantity)
    {
        if (quantity <= 0)
            throw new ArgumentException("Số lượng giảm phải lớn hơn 0.");

        if (quantity >= Quantity)
            throw new ArgumentException("Số lượng giảm phải nhỏ hơn số lượng hiện tại.");

        Quantity -= quantity;
        TotalPrice = Quantity * UnitPrice;
        UpdatedAt = DateTime.UtcNow;
    }
}
