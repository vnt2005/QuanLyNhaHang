using MediatR;
using Microsoft.EntityFrameworkCore;
using QuanLyNhaHang.Application.Common.Interfaces;
using QuanLyNhaHang.Application.Common.Models;
using QuanLyNhaHang.Application.Features.Users.DTOs;

namespace QuanLyNhaHang.Application.Features.Users.Queries.GetWithPaginatedList;

public class GetUsersWithPaginatedListQueryHandler
    : IRequestHandler<GetUsersWithPaginatedListQuery, PaginatedList<UserDto>>
{
    private readonly IApplicationDbContext _context;

    public GetUsersWithPaginatedListQueryHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<PaginatedList<UserDto>> Handle(
        GetUsersWithPaginatedListQuery request,
        CancellationToken cancellationToken)
    {
        var query = _context.Users
            .AsNoTracking()
            .AsQueryable();

        if (!string.IsNullOrWhiteSpace(request.Keyword))
        {
            query = query.Where(x =>
                x.FullName.Contains(request.Keyword) ||
                x.Email.Contains(request.Keyword) ||
                x.PhoneNumber.Contains(request.Keyword));
        }

        var result = query
            .OrderByDescending(x => x.CreatedAt)
            .Select(x => new UserDto
            {
                Id = x.Id,
                FullName = x.FullName,
                Email = x.Email,
                PhoneNumber = x.PhoneNumber,
                Role = x.Role,
                IsActive = x.IsActive,
                CreatedAt = x.CreatedAt,
                UpdatedAt = x.UpdatedAt
            });

        return await PaginatedList<UserDto>.CreateAsync(
            result,
            request.PageNumber,
            request.PageSize,
            cancellationToken);
    }
}