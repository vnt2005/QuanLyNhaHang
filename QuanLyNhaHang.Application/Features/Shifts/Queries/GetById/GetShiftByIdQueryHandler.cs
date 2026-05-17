using MediatR;
using Microsoft.EntityFrameworkCore;
using QuanLyNhaHang.Application.Common.Interfaces;
using QuanLyNhaHang.Application.Features.Shifts.DTOs;

namespace QuanLyNhaHang.Application.Features.Shifts.Queries.GetById;

public class GetShiftByIdQueryHandler
    : IRequestHandler<GetShiftByIdQuery, ShiftDto?>
{
    private readonly IApplicationDbContext _context;

    public GetShiftByIdQueryHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<ShiftDto?> Handle(
        GetShiftByIdQuery request,
        CancellationToken cancellationToken)
    {
        return await _context.Shifts
            .AsNoTracking()
            .Where(x => x.Id == request.Id)
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
            .FirstOrDefaultAsync(cancellationToken);
    }
}