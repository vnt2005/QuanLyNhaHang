namespace QuanLyNhaHang.Domain.Entities;

public class Order
{
    public Guid Id { get; private set; }

    public Guid? RestaurantTableId { get; private set; }

    public Guid? CustomerUserId { get; private set; }

    public string OrderType { get; private set; } = "DineIn";

    public string? CustomerName { get; private set; }

    public string? CustomerPhoneNumber { get; private set; }

    public DateTime? PickupTime { get; private set; }

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

        OrderType = "DineIn";
        Status = "Pending";
        TotalAmount = 0;
        IsActive = true;
        CreatedAt = DateTime.UtcNow;
    }

    public static Order CreateTakeaway(
        string orderCode,
        string customerName,
        string customerPhoneNumber,
        DateTime? pickupTime,
        string? note)
    {
        var order = new Order
        {
            Id = Guid.NewGuid(),
            OrderType = "Takeaway",
            Status = "Pending",
            TotalAmount = 0,
            IsActive = true,
            CreatedAt = DateTime.UtcNow
        };

        order.SetOrderCode(orderCode);
        order.SetTakeawayCustomer(customerName, customerPhoneNumber);
        order.SetPickupTime(pickupTime);
        order.SetNote(note);

        return order;
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
        OrderType = "DineIn";
        CustomerName = null;
        CustomerPhoneNumber = null;
        PickupTime = null;
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

    public void MarkReady()
    {
        Status = "Ready";
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

    private void SetTakeawayCustomer(
        string customerName,
        string customerPhoneNumber)
    {
        if (string.IsNullOrWhiteSpace(customerName))
            throw new ArgumentException("Tên khách nhận món không được để trống.");

        if (string.IsNullOrWhiteSpace(customerPhoneNumber))
            throw new ArgumentException("Số điện thoại nhận món không được để trống.");

        CustomerName = customerName.Trim();
        CustomerPhoneNumber = customerPhoneNumber.Trim();
    }

    private void SetPickupTime(DateTime? pickupTime)
    {
        PickupTime = pickupTime?.ToUniversalTime();
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
