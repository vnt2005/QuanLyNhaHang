using MediatR;
using Microsoft.EntityFrameworkCore;
using QuanLyNhaHang.Application.Common.Interfaces;
using QuanLyNhaHang.Application.Features.Shifts.DTOs;

namespace QuanLyNhaHang.Application.Features.Shifts.Queries.GetList;

public class GetShiftListQueryHandler
    : IRequestHandler<GetShiftListQuery, List<ShiftDto>>
{
    private readonly IApplicationDbContext _context;

    public GetShiftListQueryHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<List<ShiftDto>> Handle(
        GetShiftListQuery request,
        CancellationToken cancellationToken)
    {
        return await _context.Shifts
            .AsNoTracking()
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
            })
            .ToListAsync(cancellationToken);
    }
}