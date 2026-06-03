using MediatR;
using Microsoft.EntityFrameworkCore;
using QuanLyNhaHang.Application.Common.Interfaces;
using QuanLyNhaHang.Application.Features.Areas.DTOs;

namespace QuanLyNhaHang.Application.Features.Areas.Queries.GetList;

public class GetAreaListQueryHandler : IRequestHandler<GetAreaListQuery, List<AreaDto>>
{
    private readonly IApplicationDbContext _context;

    public GetAreaListQueryHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<List<AreaDto>> Handle(
        GetAreaListQuery request,
        CancellationToken cancellationToken)
    {
        return await _context.Areas
            .OrderByDescending(x => x.CreatedAt)
            .Select(x => new AreaDto
            {
                Id = x.Id,
                Name = x.Name,
                Description = x.Description,
                IsActive = x.IsActive,
                CreatedAt = x.CreatedAt,
                UpdatedAt = x.UpdatedAt
            })
            .ToListAsync(cancellationToken);
    }
}