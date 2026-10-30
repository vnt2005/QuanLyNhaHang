namespace QuanLyNhaHang.Domain.Entities;

public class Shift
{
    public Guid Id { get; private set; }

    public string ShiftCode { get; private set; } = string.Empty;

    public string ShiftName { get; private set; } = string.Empty;

    public TimeSpan StartTime { get; private set; }

    public TimeSpan EndTime { get; private set; }

    public bool IsOvernight { get; private set; }

    public string? Description { get; private set; }

    public bool IsActive { get; private set; }

    public DateTime CreatedAt { get; private set; }

    public DateTime? UpdatedAt { get; private set; }

    protected Shift()
    {
    }

    public Shift(
        string shiftCode,
        string shiftName,
        TimeSpan startTime,
        TimeSpan endTime,
        string? description,
        bool? isOvernight = null)
    {
        Id = Guid.NewGuid();

        SetShiftCode(shiftCode);
        SetShiftName(shiftName);
        SetTime(startTime, endTime, isOvernight);
        SetDescription(description);

        IsActive = true;
        CreatedAt = DateTime.UtcNow;
    }

    public void UpdateInfo(
        string shiftCode,
        string shiftName,
        TimeSpan startTime,
        TimeSpan endTime,
        string? description,
        bool? isOvernight = null)
    {
        SetShiftCode(shiftCode);
        SetShiftName(shiftName);
        SetTime(startTime, endTime, isOvernight);
        SetDescription(description);

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

    private void SetShiftCode(string shiftCode)
    {
        if (string.IsNullOrWhiteSpace(shiftCode))
            throw new ArgumentException("Mã ca làm việc không được để trống.");

        ShiftCode = shiftCode.Trim().ToUpper();
    }

    private void SetShiftName(string shiftName)
    {
        if (string.IsNullOrWhiteSpace(shiftName))
            throw new ArgumentException("Tên ca làm việc không được để trống.");

        ShiftName = shiftName.Trim();
    }

    private void SetTime(TimeSpan startTime, TimeSpan endTime, bool? isOvernight = null)
    {
        if (startTime < TimeSpan.Zero || startTime >= TimeSpan.FromDays(1))
            throw new ArgumentException("Giờ bắt đầu không hợp lệ.");

        if (endTime < TimeSpan.Zero || endTime > TimeSpan.FromDays(1))
            throw new ArgumentException("Giờ kết thúc không hợp lệ.");

        if (startTime == endTime)
            throw new ArgumentException("Giờ bắt đầu và giờ kết thúc không được trùng nhau.");

        var overnight = isOvernight ?? (startTime > endTime);

        if (!overnight && startTime > endTime)
            throw new ArgumentException("Giờ bắt đầu phải nhỏ hơn giờ kết thúc.");

        if (overnight && startTime < endTime)
        {
            overnight = false;
        }

        StartTime = startTime;
        EndTime = endTime;
        IsOvernight = overnight;
    }

    private void SetDescription(string? description)
    {
        Description = string.IsNullOrWhiteSpace(description)
            ? null
            : description.Trim();
    }
}
