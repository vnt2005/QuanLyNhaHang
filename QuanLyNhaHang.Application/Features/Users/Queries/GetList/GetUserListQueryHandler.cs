using MediatR;
using Microsoft.EntityFrameworkCore;
using QuanLyNhaHang.Application.Common.Interfaces;
using QuanLyNhaHang.Application.Features.Users.DTOs;

namespace QuanLyNhaHang.Application.Features.Users.Queries.GetList;

public class GetUserListQueryHandler
    : IRequestHandler<GetUserListQuery, List<UserDto>>
{
    private readonly IApplicationDbContext _context;

    public GetUserListQueryHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<List<UserDto>> Handle(
        GetUserListQuery request,
        CancellationToken cancellationToken)
    {
        return await _context.Users
            .AsNoTracking()
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
            })
            .ToListAsync(cancellationToken);
    }
}