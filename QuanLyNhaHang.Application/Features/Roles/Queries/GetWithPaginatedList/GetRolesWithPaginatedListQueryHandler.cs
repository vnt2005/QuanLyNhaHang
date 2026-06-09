using MediatR;
using Microsoft.EntityFrameworkCore;
using QuanLyNhaHang.Application.Common.Interfaces;
using QuanLyNhaHang.Application.Common.Models;
using QuanLyNhaHang.Application.Features.Roles.DTOs;

namespace QuanLyNhaHang.Application.Features.Roles.Queries.GetWithPaginatedList;

public class GetRolesWithPaginatedListQueryHandler
    : IRequestHandler<GetRolesWithPaginatedListQuery, PaginatedList<RoleDto>>
{
    private readonly IApplicationDbContext _context;

    public GetRolesWithPaginatedListQueryHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<PaginatedList<RoleDto>> Handle(
        GetRolesWithPaginatedListQuery request,
        CancellationToken cancellationToken)
    {
        var query = _context.Roles
            .AsNoTracking()
            .AsQueryable();

        if (!string.IsNullOrWhiteSpace(request.Keyword))
        {
            var keyword = request.Keyword.Trim();

            query = query.Where(x =>
                x.Name.Contains(keyword) ||
                x.DisplayName.Contains(keyword) ||
                (x.Description != null && x.Description.Contains(keyword)));
        }

        if (request.IsActive.HasValue)
        {
            query = query.Where(x => x.IsActive == request.IsActive.Value);
        }

        var roleDtos = query
            .OrderBy(x => x.Name)
            .Select(x => new RoleDto
            {
                Id = x.Id,
                Name = x.Name,
                DisplayName = x.DisplayName,
                Description = x.Description,
                IsActive = x.IsActive,
                CreatedAt = x.CreatedAt,
                UpdatedAt = x.UpdatedAt
            });

        return await PaginatedList<RoleDto>.CreateAsync(
            roleDtos,
            request.PageNumber,
            request.PageSize);
    }
}