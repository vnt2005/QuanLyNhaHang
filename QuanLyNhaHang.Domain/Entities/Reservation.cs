namespace QuanLyNhaHang.Domain.Entities;

public class Reservation
{
    public Guid Id { get; private set; }

    public string ReservationCode { get; private set; } = string.Empty;

    public Guid RestaurantTableId { get; private set; }

    public string CustomerName { get; private set; } = string.Empty;

    public string PhoneNumber { get; private set; } = string.Empty;

    public string? Email { get; private set; }

    public int NumberOfGuests { get; private set; }

    public DateTime ReservationTime { get; private set; }

    public decimal DepositAmount { get; private set; }

    public string Status { get; private set; } = string.Empty;

    public string? Note { get; private set; }

    public DateTime CreatedAt { get; private set; }

    public DateTime? ConfirmedAt { get; private set; }

    public DateTime? CheckedInAt { get; private set; }

    public DateTime? CompletedAt { get; private set; }

    public DateTime? CancelledAt { get; private set; }

    public DateTime? UpdatedAt { get; private set; }

    public byte[] RowVersion { get; private set; } = [];

    protected Reservation()
    {
    }

    public Reservation(
        Guid restaurantTableId,
        string customerName,
        string phoneNumber,
        string? email,
        int numberOfGuests,
        DateTime reservationTime,
        decimal depositAmount,
        string? note)
    {
        Id = Guid.NewGuid();

        SetRestaurantTableId(restaurantTableId);
        SetCustomerName(customerName);
        SetPhoneNumber(phoneNumber);
        SetEmail(email);
        SetNumberOfGuests(numberOfGuests);
        SetReservationTime(reservationTime);
        SetDepositAmount(depositAmount);
        SetNote(note);

        ReservationCode = GenerateReservationCode();
        Status = "Pending";
        CreatedAt = DateTime.UtcNow;
    }

    public void UpdateInfo(
        Guid restaurantTableId,
        string customerName,
        string phoneNumber,
        string? email,
        int numberOfGuests,
        DateTime reservationTime,
        decimal depositAmount,
        string? note)
    {
        if (Status != "Pending" && Status != "Confirmed")
        {
            throw new InvalidOperationException(
                "Chỉ đặt bàn đang chờ hoặc đã xác nhận mới có thể cập nhật.");
        }

        SetRestaurantTableId(restaurantTableId);
        SetCustomerName(customerName);
        SetPhoneNumber(phoneNumber);
        SetEmail(email);
        SetNumberOfGuests(numberOfGuests);
        SetReservationTime(reservationTime);
        SetDepositAmount(depositAmount);
        SetNote(note);

        UpdatedAt = DateTime.UtcNow;
    }

    public void Confirm()
    {
        if (Status != "Pending")
        {
            throw new InvalidOperationException(
                "Chỉ đặt bàn đang chờ mới có thể xác nhận.");
        }

        Status = "Confirmed";
        ConfirmedAt = DateTime.UtcNow;
        UpdatedAt = DateTime.UtcNow;
    }

    public void CheckIn()
    {
        if (Status != "Confirmed")
        {
            throw new InvalidOperationException(
                "Chỉ đặt bàn đã xác nhận mới có thể nhận bàn.");
        }

        Status = "CheckedIn";
        CheckedInAt = DateTime.UtcNow;
        UpdatedAt = DateTime.UtcNow;
    }

    public void Complete()
    {
        if (Status != "CheckedIn")
        {
            throw new InvalidOperationException(
                "Chỉ đặt bàn đã nhận bàn mới có thể hoàn tất.");
        }

        Status = "Completed";
        CompletedAt = DateTime.UtcNow;
        UpdatedAt = DateTime.UtcNow;
    }

    public void Cancel()
    {
        if (Status != "Pending" && Status != "Confirmed")
        {
            throw new InvalidOperationException(
                "Chỉ đặt bàn đang chờ hoặc đã xác nhận mới có thể hủy.");
        }

        Status = "Cancelled";
        CancelledAt = DateTime.UtcNow;
        UpdatedAt = DateTime.UtcNow;
    }

    public void MarkNoShow()
    {
        if (Status != "Pending" && Status != "Confirmed")
        {
            throw new InvalidOperationException(
                "Chỉ đặt bàn đang chờ hoặc đã xác nhận mới có thể chuyển sang vắng mặt.");
        }

        Status = "NoShow";
        UpdatedAt = DateTime.UtcNow;
    }

    private void SetRestaurantTableId(Guid restaurantTableId)
    {
        if (restaurantTableId == Guid.Empty)
            throw new ArgumentException("Bàn đặt không hợp lệ.");

        RestaurantTableId = restaurantTableId;
    }

    private void SetCustomerName(string customerName)
    {
        if (string.IsNullOrWhiteSpace(customerName))
            throw new ArgumentException("Tên khách hàng không được để trống.");

        CustomerName = customerName.Trim();
    }

    private void SetPhoneNumber(string phoneNumber)
    {
        if (string.IsNullOrWhiteSpace(phoneNumber))
            throw new ArgumentException("Số điện thoại không được để trống.");

        PhoneNumber = phoneNumber.Trim();
    }

    private void SetEmail(string? email)
    {
        Email = string.IsNullOrWhiteSpace(email)
            ? null
            : email.Trim().ToLower();
    }

    private void SetNumberOfGuests(int numberOfGuests)
    {
        if (numberOfGuests <= 0)
            throw new ArgumentException("Số lượng khách phải lớn hơn 0.");

        NumberOfGuests = numberOfGuests;
    }

    private void SetReservationTime(DateTime reservationTime)
    {
        ReservationTime = reservationTime;
    }

    private void SetDepositAmount(decimal depositAmount)
    {
        if (depositAmount < 0)
            throw new ArgumentException("Tiền cọc không được nhỏ hơn 0.");

        DepositAmount = depositAmount;
    }

    private void SetNote(string? note)
    {
        Note = string.IsNullOrWhiteSpace(note)
            ? null
            : note.Trim();
    }

    private static string GenerateReservationCode()
    {
        return $"RSV-{DateTime.UtcNow:yyyyMMddHHmmssfff}-" +
               Guid.NewGuid().ToString("N")[..8].ToUpperInvariant();
    }
}
