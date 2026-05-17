using MediatR;
using QuanLyNhaHang.Application.Features.Employees.DTOs;

namespace QuanLyNhaHang.Application.Features.Employees.Queries.GetById;

public record GetEmployeeByIdQuery(Guid Id) : IRequest<EmployeeDto?>;