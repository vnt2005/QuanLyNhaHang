namespace QuanLyNhaHang.Application.Features.EmployeeShifts.DTOs;

public class EmployeeShiftDto
{
    public Guid Id { get; set; }

    public Guid EmployeeId { get; set; }

    public string EmployeeCode { get; set; } = string.Empty;

    public string? EmployeeHo { get; set; }

    public string EmployeeTen { get; set; } = string.Empty;

    public Guid ShiftId { get; set; }

    public string ShiftCode { get; set; } = string.Empty;

    public string ShiftName { get; set; } = string.Empty;

    public TimeSpan StartTime { get; set; }

    public TimeSpan EndTime { get; set; }

    public DateTime WorkDate { get; set; }

    public string? Note { get; set; }

    public bool IsActive { get; set; }

    public DateTime CreatedAt { get; set; }

    public DateTime? UpdatedAt { get; set; }
}