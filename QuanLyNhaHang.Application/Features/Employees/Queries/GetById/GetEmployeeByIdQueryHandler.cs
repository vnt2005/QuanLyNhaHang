using MediatR;
using Microsoft.EntityFrameworkCore;
using QuanLyNhaHang.Application.Common.Interfaces;
using QuanLyNhaHang.Application.Features.Employees.DTOs;

namespace QuanLyNhaHang.Application.Features.Employees.Queries.GetById;

public class GetEmployeeByIdQueryHandler
    : IRequestHandler<GetEmployeeByIdQuery, EmployeeDto?>
{
    private readonly IApplicationDbContext _context;

    public GetEmployeeByIdQueryHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<EmployeeDto?> Handle(
        GetEmployeeByIdQuery request,
        CancellationToken cancellationToken)
    {
        return await _context.Employees
            .AsNoTracking()
            .Where(x => x.Id == request.Id)
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
            })
            .FirstOrDefaultAsync(cancellationToken);
    }
}