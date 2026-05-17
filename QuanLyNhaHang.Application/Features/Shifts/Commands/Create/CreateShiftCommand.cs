using MediatR;

namespace QuanLyNhaHang.Application.Features.Shifts.Commands.Create;

public class CreateShiftCommand : IRequest<Guid>
{
    public string ShiftCode { get; set; } = string.Empty;

    public string ShiftName { get; set; } = string.Empty;

    public TimeSpan StartTime { get; set; }

    public TimeSpan EndTime { get; set; }

    public string? Description { get; set; }
}