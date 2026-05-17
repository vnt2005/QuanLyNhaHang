using MediatR;

namespace QuanLyNhaHang.Application.Features.Employees.Commands.Delete;

public record DeleteEmployeeCommand(Guid Id) : IRequest<bool>;