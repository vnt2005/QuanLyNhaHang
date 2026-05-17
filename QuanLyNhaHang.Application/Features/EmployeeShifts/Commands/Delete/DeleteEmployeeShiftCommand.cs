using MediatR;

namespace QuanLyNhaHang.Application.Features.EmployeeShifts.Commands.Delete;

public record DeleteEmployeeShiftCommand(Guid Id) : IRequest<bool>;