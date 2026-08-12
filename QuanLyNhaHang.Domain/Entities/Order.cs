namespace QuanLyNhaHang.Domain.Entities;

public class Order
{
    public Guid Id { get; private set; }

    public Guid RestaurantTableId { get; private set; }

    public Guid? CustomerUserId { get; private set; }

    public string OrderCode { get; private set; } = string.Empty;

    public string Status { get; private set; } = string.Empty;

    public decimal TotalAmount { get; private set; }

    public string? Note { get; private set; }

    public bool IsActive { get; private set; }

    public DateTime CreatedAt { get; private set; }

    public DateTime? UpdatedAt { get; private set; }

    protected Order()
    {
    }

    public Order(
        Guid restaurantTableId,
        string orderCode,
        string? note)
    {
        Id = Guid.NewGuid();

        SetRestaurantTableId(restaurantTableId);
        SetOrderCode(orderCode);
        SetNote(note);

        Status = "Pending";
        TotalAmount = 0;
        IsActive = true;
        CreatedAt = DateTime.UtcNow;
    }

    public void AssignCustomer(Guid customerUserId)
    {
        if (customerUserId == Guid.Empty)
            throw new ArgumentException("Khách hàng không hợp lệ.");

        if (CustomerUserId.HasValue &&
            CustomerUserId.Value != customerUserId)
        {
            throw new InvalidOperationException(
                "Không thể lưu đơn này vào tài khoản.");
        }

        if (CustomerUserId == customerUserId)
            return;

        CustomerUserId = customerUserId;
        UpdatedAt = DateTime.UtcNow;
    }

    public void UpdateInfo(string? note)
    {
        SetNote(note);

        UpdatedAt = DateTime.UtcNow;
    }

    public void ChangeRestaurantTable(Guid restaurantTableId)
    {
        SetRestaurantTableId(restaurantTableId);
        UpdatedAt = DateTime.UtcNow;
    }

    public void UpdateTotalAmount(decimal totalAmount)
    {
        if (totalAmount < 0)
            throw new ArgumentException("Tổng tiền không được nhỏ hơn 0.");

        TotalAmount = totalAmount;
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

    public void MarkCompleted()
    {
        Status = "Completed";
        UpdatedAt = DateTime.UtcNow;
    }

    public void Cancel()
    {
        Status = "Cancelled";
        UpdatedAt = DateTime.UtcNow;
    }

    public void Deactivate()
    {
        IsActive = false;
        UpdatedAt = DateTime.UtcNow;
    }

    private void SetRestaurantTableId(Guid restaurantTableId)
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

    private void SetNote(string? note)
    {
        Note = string.IsNullOrWhiteSpace(note)
            ? null
            : note.Trim();
    }
}
