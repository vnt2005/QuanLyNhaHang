using MediatR;

namespace QuanLyNhaHang.Application.Features.EmployeeShifts.Commands.Update;

public class UpdateEmployeeShiftCommand : IRequest<bool>
{
    public Guid Id { get; set; }

    public Guid EmployeeId { get; set; }

    public Guid ShiftId { get; set; }

    public DateTime WorkDate { get; set; }

    public string? Note { get; set; }

    public bool IsActive { get; set; }
}