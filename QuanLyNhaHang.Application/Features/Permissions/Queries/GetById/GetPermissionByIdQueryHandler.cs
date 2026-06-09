using MediatR;
using Microsoft.EntityFrameworkCore;
using QuanLyNhaHang.Application.Common.Interfaces;
using QuanLyNhaHang.Application.Features.Permissions.DTOs;

namespace QuanLyNhaHang.Application.Features.Permissions.Queries.GetById;

public class GetPermissionByIdQueryHandler
    : IRequestHandler<GetPermissionByIdQuery, PermissionDto?>
{
    private readonly IApplicationDbContext _context;

    public GetPermissionByIdQueryHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<PermissionDto?> Handle(
        GetPermissionByIdQuery request,
        CancellationToken cancellationToken)
    {
        var permission = await _context.Permissions
            .AsNoTracking()
            .Where(x => x.Id == request.Id)
            .Select(x => new PermissionDto
            {
                Id = x.Id,
                Code = x.Code,
                Name = x.Name,
                GroupName = x.GroupName,
                Description = x.Description,
                IsActive = x.IsActive,
                CreatedAt = x.CreatedAt,
                UpdatedAt = x.UpdatedAt
            })
            .FirstOrDefaultAsync(cancellationToken);

        return permission;
    }
}