namespace QuanLyNhaHang.Domain.Entities;

public class EmployeeShift
{
    public Guid Id { get; private set; }

    public Guid EmployeeId { get; private set; }

    public Guid ShiftId { get; private set; }

    public DateTime WorkDate { get; private set; }

    public string? Note { get; private set; }

    public bool IsActive { get; private set; }

    public DateTime CreatedAt { get; private set; }

    public DateTime? UpdatedAt { get; private set; }

    protected EmployeeShift()
    {
    }

    public EmployeeShift(
        Guid employeeId,
        Guid shiftId,
        DateTime workDate,
        string? note)
    {
        Id = Guid.NewGuid();

        SetEmployeeId(employeeId);
        SetShiftId(shiftId);
        SetWorkDate(workDate);
        SetNote(note);

        IsActive = true;
        CreatedAt = DateTime.UtcNow;
    }

    public void UpdateInfo(
        Guid employeeId,
        Guid shiftId,
        DateTime workDate,
        string? note)
    {
        SetEmployeeId(employeeId);
        SetShiftId(shiftId);
        SetWorkDate(workDate);
        SetNote(note);

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

    private void SetEmployeeId(Guid employeeId)
    {
        if (employeeId == Guid.Empty)
            throw new ArgumentException("Nhân viên không hợp lệ.");

        EmployeeId = employeeId;
    }

    private void SetShiftId(Guid shiftId)
    {
        if (shiftId == Guid.Empty)
            throw new ArgumentException("Ca làm việc không hợp lệ.");

        ShiftId = shiftId;
    }

    private void SetWorkDate(DateTime workDate)
    {
        if (workDate == default)
            throw new ArgumentException("Ngày làm việc không hợp lệ.");

        WorkDate = workDate.Date;
    }

    private void SetNote(string? note)
    {
        Note = string.IsNullOrWhiteSpace(note)
            ? null
            : note.Trim();
    }
}