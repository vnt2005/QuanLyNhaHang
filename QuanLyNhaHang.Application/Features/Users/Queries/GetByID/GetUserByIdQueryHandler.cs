using MediatR;
using Microsoft.EntityFrameworkCore;
using QuanLyNhaHang.Application.Common.Interfaces;
using QuanLyNhaHang.Application.Features.Users.DTOs;

namespace QuanLyNhaHang.Application.Features.Users.Queries.GetById;

public class GetUserByIdQueryHandler
    : IRequestHandler<GetUserByIdQuery, UserDto?>
{
    private readonly IApplicationDbContext _context;

    public GetUserByIdQueryHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<UserDto?> Handle(
        GetUserByIdQuery request,
        CancellationToken cancellationToken)
    {
        return await _context.Users
            .AsNoTracking()
            .Where(x => x.Id == request.Id)
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
            })
            .FirstOrDefaultAsync(cancellationToken);
    }
}