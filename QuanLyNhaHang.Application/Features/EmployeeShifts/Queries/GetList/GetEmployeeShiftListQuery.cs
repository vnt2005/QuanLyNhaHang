using MediatR;
using QuanLyNhaHang.Application.Features.EmployeeShifts.DTOs;

namespace QuanLyNhaHang.Application.Features.EmployeeShifts.Queries.GetList;

public record GetEmployeeShiftListQuery : IRequest<List<EmployeeShiftDto>>;