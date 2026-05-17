using MediatR;
using QuanLyNhaHang.Application.Features.EmployeeShifts.DTOs;

namespace QuanLyNhaHang.Application.Features.EmployeeShifts.Queries.GetById;

public record GetEmployeeShiftByIdQuery(Guid Id) : IRequest<EmployeeShiftDto?>;