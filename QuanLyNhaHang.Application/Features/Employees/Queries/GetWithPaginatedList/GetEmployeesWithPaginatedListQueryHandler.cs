using MediatR;
using Microsoft.EntityFrameworkCore;
using QuanLyNhaHang.Application.Common.Interfaces;
using QuanLyNhaHang.Application.Common.Models;
using QuanLyNhaHang.Application.Features.Employees.DTOs;

namespace QuanLyNhaHang.Application.Features.Employees.Queries.GetWithPaginatedList;

public class GetEmployeesWithPaginatedListQueryHandler
    : IRequestHandler<GetEmployeesWithPaginatedListQuery, PaginatedList<EmployeeDto>>
{
    private readonly IApplicationDbContext _context;

    public GetEmployeesWithPaginatedListQueryHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<PaginatedList<EmployeeDto>> Handle(
        GetEmployeesWithPaginatedListQuery request,
        CancellationToken cancellationToken)
    {
        var query = _context.Employees
            .AsNoTracking()
            .AsQueryable();

        if (!string.IsNullOrWhiteSpace(request.Keyword))
        {
            var keyword = request.Keyword.Trim();

            query = query.Where(x =>
                x.EmployeeCode.Contains(keyword) ||
                (x.Ho != null && x.Ho.Contains(keyword)) ||
                x.Ten.Contains(keyword) ||
                ((x.Ho ?? "") + " " + x.Ten).Contains(keyword) ||
                (x.Email != null && x.Email.Contains(keyword)) ||
                x.PhoneNumber.Contains(keyword) ||
                x.Position.Contains(keyword));
        }

        var result = query
            .OrderByDescending(x => x.CreatedAt)
            .Select(x => new EmployeeDto
            {
                Id = x.Id,
                EmployeeCode = x.EmployeeCode,
                Ho = x.Ho,
                Ten = x.Ten,
                Email = x.Email,
                PhoneNumber = x.PhoneNumber,
                DateOfBirth = x.DateOfBirth,
                Address = x.Address,
                Position = x.Position,
                BaseSalary = x.BaseSalary,
                HireDate = x.HireDate,
                IsActive = x.IsActive,
                CreatedAt = x.CreatedAt,
                UpdatedAt = x.UpdatedAt
            });

        return await PaginatedList<EmployeeDto>.CreateAsync(
            result,
            request.PageNumber,
            request.PageSize,
            cancellationToken);
    }
}