using MediatR;
using QuanLyNhaHang.Application.Common.Models;
using QuanLyNhaHang.Application.Features.Employees.DTOs;

namespace QuanLyNhaHang.Application.Features.Employees.Queries.GetWithPaginatedList;

public class GetEmployeesWithPaginatedListQuery : IRequest<PaginatedList<EmployeeDto>>
{
    public string? Keyword { get; set; }

    public int PageNumber { get; set; } = 1;

    public int PageSize { get; set; } = 10;
}