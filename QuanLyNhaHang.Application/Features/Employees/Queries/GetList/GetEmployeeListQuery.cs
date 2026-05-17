using MediatR;
using QuanLyNhaHang.Application.Features.Employees.DTOs;

namespace QuanLyNhaHang.Application.Features.Employees.Queries.GetList;

public record GetEmployeeListQuery : IRequest<List<EmployeeDto>>;