using MediatR;
using Microsoft.EntityFrameworkCore;
using QuanLyNhaHang.Application.Common.Interfaces;
using QuanLyNhaHang.Application.Common.Models;
using QuanLyNhaHang.Application.Features.Permissions.DTOs;

namespace QuanLyNhaHang.Application.Features.Permissions.Queries.GetWithPaginatedList;

public class GetPermissionsWithPaginatedListQueryHandler
    : IRequestHandler<GetPermissionsWithPaginatedListQuery, PaginatedList<PermissionDto>>
{
    private readonly IApplicationDbContext _context;

    public GetPermissionsWithPaginatedListQueryHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<PaginatedList<PermissionDto>> Handle(
        GetPermissionsWithPaginatedListQuery request,
        CancellationToken cancellationToken)
    {
        var query = _context.Permissions
            .AsNoTracking()
            .AsQueryable();

        if (!string.IsNullOrWhiteSpace(request.Keyword))
        {
            var keyword = request.Keyword.Trim();

            query = query.Where(x =>
                x.Code.Contains(keyword) ||
                x.Name.Contains(keyword) ||
                x.GroupName.Contains(keyword) ||
                (x.Description != null && x.Description.Contains(keyword)));
        }

        if (!string.IsNullOrWhiteSpace(request.GroupName))
        {
            query = query.Where(x => x.GroupName == request.GroupName);
        }

        if (request.IsActive.HasValue)
        {
            query = query.Where(x => x.IsActive == request.IsActive.Value);
        }

        var permissionDtos = query
            .OrderBy(x => x.GroupName)
            .ThenBy(x => x.Code)
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
            });

        return await PaginatedList<PermissionDto>.CreateAsync(
            permissionDtos,
            request.PageNumber,
            request.PageSize);
    }
}