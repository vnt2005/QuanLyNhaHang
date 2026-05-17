using MediatR;

namespace QuanLyNhaHang.Application.Features.Shifts.Commands.Update;

public class UpdateShiftCommand : IRequest<bool>
{
    public Guid Id { get; set; }

    public string ShiftCode { get; set; } = string.Empty;

    public string ShiftName { get; set; } = string.Empty;

    public TimeSpan StartTime { get; set; }

    public TimeSpan EndTime { get; set; }

    public string? Description { get; set; }

    public bool IsActive { get; set; }
}