using MediatR;

namespace QuanLyNhaHang.Application.Features.EmployeeShifts.Commands.Create;

public class CreateEmployeeShiftCommand : IRequest<Guid>
{
    public Guid EmployeeId { get; set; }

    public Guid ShiftId { get; set; }

    public DateTime WorkDate { get; set; }

    public string? Note { get; set; }
}