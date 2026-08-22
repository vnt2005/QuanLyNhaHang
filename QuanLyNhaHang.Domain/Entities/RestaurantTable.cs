namespace QuanLyNhaHang.Domain.Entities;

public class RestaurantTable
{
    public Guid Id { get; private set; }

    public Guid AreaId { get; private set; }

    public string Name { get; private set; } = string.Empty;

    public int Capacity { get; private set; }

    public string Status { get; private set; } = string.Empty;

    public string? Note { get; private set; }

    public bool IsActive { get; private set; }

    public DateTime CreatedAt { get; private set; }

    public DateTime? UpdatedAt { get; private set; }

    public byte[] RowVersion { get; private set; } = [];

    protected RestaurantTable()
    {
    }

    public RestaurantTable(
        Guid areaId,
        string name,
        int capacity,
        string? note)
    {
        Id = Guid.NewGuid();

        SetAreaId(areaId);
        SetName(name);
        SetCapacity(capacity);
        SetNote(note);

        Status = "Available";
        IsActive = true;
        CreatedAt = DateTime.UtcNow;
    }

    public void UpdateInfo(
        Guid areaId,
        string name,
        int capacity,
        string? note)
    {
        SetAreaId(areaId);
        SetName(name);
        SetCapacity(capacity);
        SetNote(note);

        UpdatedAt = DateTime.UtcNow;
    }

    public void MarkAvailable()
    {
        Status = "Available";
        UpdatedAt = DateTime.UtcNow;
    }

    public void MarkOccupied()
    {
        Status = "Occupied";
        UpdatedAt = DateTime.UtcNow;
    }

    public void MarkReserved()
    {
        Status = "Reserved";
        UpdatedAt = DateTime.UtcNow;
    }

    public void MarkCleaning()
    {
        Status = "Cleaning";
        UpdatedAt = DateTime.UtcNow;
    }

    public void Activate()
    {
        IsActive = true;
        UpdatedAt = DateTime.UtcNow;
    }

    public void Deactivate()
    {
        IsActive = false;
        UpdatedAt = DateTime.UtcNow;
    }

    private void SetAreaId(Guid areaId)
    {
        if (areaId == Guid.Empty)
            throw new ArgumentException("Khu vực không hợp lệ.");

        AreaId = areaId;
    }

    private void SetName(string name)
    {
        if (string.IsNullOrWhiteSpace(name))
            throw new ArgumentException("Tên bàn không được để trống.");

        Name = name.Trim();
    }

    private void SetCapacity(int capacity)
    {
        if (capacity <= 0)
            throw new ArgumentException("Sức chứa của bàn phải lớn hơn 0.");

        Capacity = capacity;
    }

    private void SetNote(string? note)
    {
        Note = string.IsNullOrWhiteSpace(note)
            ? null
            : note.Trim();
    }
}
