using MediatR;
using Microsoft.EntityFrameworkCore;
using QuanLyNhaHang.Application.Common.Interfaces;
using QuanLyNhaHang.Application.Common.Models;
using QuanLyNhaHang.Application.Features.Shifts.DTOs;

namespace QuanLyNhaHang.Application.Features.Shifts.Queries.GetWithPaginatedList;

public class GetShiftsWithPaginatedListQueryHandler
    : IRequestHandler<GetShiftsWithPaginatedListQuery, PaginatedList<ShiftDto>>
{
    private readonly IApplicationDbContext _context;

    public GetShiftsWithPaginatedListQueryHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<PaginatedList<ShiftDto>> Handle(
        GetShiftsWithPaginatedListQuery request,
        CancellationToken cancellationToken)
    {
        var query = _context.Shifts
            .AsNoTracking()
            .AsQueryable();

        if (!string.IsNullOrWhiteSpace(request.Keyword))
        {
            var keyword = request.Keyword.Trim();

            query = query.Where(x =>
                x.ShiftCode.Contains(keyword) ||
                x.ShiftName.Contains(keyword) ||
                (x.Description != null && x.Description.Contains(keyword)));
        }

        var result = query
            .OrderBy(x => x.StartTime)
            .Select(x => new ShiftDto
            {
                Id = x.Id,
                ShiftCode = x.ShiftCode,
                ShiftName = x.ShiftName,
                StartTime = x.StartTime,
                EndTime = x.EndTime,
                Description = x.Description,
                IsActive = x.IsActive,
                CreatedAt = x.CreatedAt,
                UpdatedAt = x.UpdatedAt
            });

        return await PaginatedList<ShiftDto>.CreateAsync(
            result,
            request.PageNumber,
            request.PageSize,
            cancellationToken);
    }
}