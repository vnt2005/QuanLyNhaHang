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
            var keyword = request.Keyword.Trim();

            query = query.Where(x =>
                (x.Ho != null && x.Ho.Contains(keyword)) ||
                x.Ten.Contains(keyword) ||
                ((x.Ho ?? "") + " " + x.Ten).Contains(keyword) ||
                x.Email.Contains(keyword) ||
                x.PhoneNumber.Contains(keyword));
        }

        if (!string.IsNullOrWhiteSpace(request.Role))
        {
            var role = request.Role.Trim();
            query = query.Where(x => x.Role == role);
        }

        if (request.IsActive.HasValue)
        {
            query = query.Where(x => x.IsActive == request.IsActive.Value);
        }

        if (request.IsEmailVerified.HasValue)
        {
            query = query.Where(
                x => x.IsEmailVerified == request.IsEmailVerified.Value);
        }

        var result = query
            .OrderByDescending(x => x.CreatedAt)
            .Select(x => new UserDto
            {
                Id = x.Id,
                Ho = x.Ho,
                Ten = x.Ten,
                Email = x.Email,
                PhoneNumber = x.PhoneNumber,
                Role = x.Role,
                IsActive = x.IsActive,
                IsEmailVerified = x.IsEmailVerified,
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
