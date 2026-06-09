namespace QuanLyNhaHang.Domain.Entities;

public class TableOperationDetail
{
    public Guid Id { get; private set; }

    public Guid TableOperationId { get; private set; }

    public Guid? FromOrderId { get; private set; }

    public Guid? ToOrderId { get; private set; }

    public Guid? OrderItemId { get; private set; }

    public Guid? MenuItemId { get; private set; }

    public string? MenuItemName { get; private set; }

    public int Quantity { get; private set; }

    public decimal UnitPrice { get; private set; }

    public decimal TotalPrice { get; private set; }

    public string? Note { get; private set; }

    public DateTime CreatedAt { get; private set; }

    protected TableOperationDetail()
    {
    }

    public TableOperationDetail(
        Guid tableOperationId,
        Guid? fromOrderId,
        Guid? toOrderId,
        Guid? orderItemId,
        Guid? menuItemId,
        string? menuItemName,
        int quantity,
        decimal unitPrice,
        decimal totalPrice,
        string? note)
    {
        Id = Guid.NewGuid();

        SetTableOperationId(tableOperationId);
        SetFromOrderId(fromOrderId);
        SetToOrderId(toOrderId);
        SetOrderItemId(orderItemId);
        SetMenuItemId(menuItemId);
        SetMenuItemName(menuItemName);
        SetQuantity(quantity);
        SetUnitPrice(unitPrice);
        SetTotalPrice(totalPrice);
        SetNote(note);

        CreatedAt = DateTime.UtcNow;
    }

    private void SetTableOperationId(Guid tableOperationId)
    {
        if (tableOperationId == Guid.Empty)
            throw new ArgumentException("Thao tác bàn không hợp lệ.");

        TableOperationId = tableOperationId;
    }

    private void SetFromOrderId(Guid? fromOrderId)
    {
        if (fromOrderId.HasValue && fromOrderId.Value == Guid.Empty)
            throw new ArgumentException("Order nguồn không hợp lệ.");

        FromOrderId = fromOrderId;
    }

    private void SetToOrderId(Guid? toOrderId)
    {
        if (toOrderId.HasValue && toOrderId.Value == Guid.Empty)
            throw new ArgumentException("Order đích không hợp lệ.");

        ToOrderId = toOrderId;
    }

    private void SetOrderItemId(Guid? orderItemId)
    {
        if (orderItemId.HasValue && orderItemId.Value == Guid.Empty)
            throw new ArgumentException("Món trong order không hợp lệ.");

        OrderItemId = orderItemId;
    }

    private void SetMenuItemId(Guid? menuItemId)
    {
        if (menuItemId.HasValue && menuItemId.Value == Guid.Empty)
            throw new ArgumentException("Món ăn không hợp lệ.");

        MenuItemId = menuItemId;
    }

    private void SetMenuItemName(string? menuItemName)
    {
        MenuItemName = string.IsNullOrWhiteSpace(menuItemName)
            ? null
            : menuItemName.Trim();
    }

    private void SetQuantity(int quantity)
    {
        if (quantity < 0)
            throw new ArgumentException("Số lượng không hợp lệ.");

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