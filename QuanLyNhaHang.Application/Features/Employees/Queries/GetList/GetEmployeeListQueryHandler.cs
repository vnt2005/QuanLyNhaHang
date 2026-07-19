using MediatR;
using Microsoft.EntityFrameworkCore;
using QuanLyNhaHang.Application.Common.Interfaces;
using QuanLyNhaHang.Application.Features.Employees.DTOs;

namespace QuanLyNhaHang.Application.Features.Employees.Queries.GetList;

public class GetEmployeeListQueryHandler
    : IRequestHandler<GetEmployeeListQuery, List<EmployeeDto>>
{
    private readonly IApplicationDbContext _context;

    public GetEmployeeListQueryHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<List<EmployeeDto>> Handle(
        GetEmployeeListQuery request,
        CancellationToken cancellationToken)
    {
        return await _context.Employees
            .AsNoTracking()
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
                UpdatedAt = x.UpdatedAt,
                UserId = x.UserId,
                Role = x.User != null ? x.User.Role : null,
                AccountIsActive = x.User != null
                    ? x.User.IsActive
                    : null
            })
            .ToListAsync(cancellationToken);
    }
}