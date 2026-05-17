using MediatR;
using QuanLyNhaHang.Application.Common.Models;
using QuanLyNhaHang.Application.Features.EmployeeShifts.DTOs;

namespace QuanLyNhaHang.Application.Features.EmployeeShifts.Queries.GetWithPaginatedList;

public class GetEmployeeShiftsWithPaginatedListQuery
    : IRequest<PaginatedList<EmployeeShiftDto>>
{
    public string? Keyword { get; set; }

    public DateTime? WorkDate { get; set; }

    public Guid? EmployeeId { get; set; }

    public Guid? ShiftId { get; set; }

    public int PageNumber { get; set; } = 1;

    public int PageSize { get; set; } = 10;
}