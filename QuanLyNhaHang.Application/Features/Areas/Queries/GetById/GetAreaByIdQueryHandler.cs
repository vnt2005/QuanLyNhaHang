using MediatR;
using Microsoft.EntityFrameworkCore;
using QuanLyNhaHang.Application.Common.Interfaces;
using QuanLyNhaHang.Application.Features.Areas.DTOs;

namespace QuanLyNhaHang.Application.Features.Areas.Queries.GetById;

public class GetAreaByIdQueryHandler : IRequestHandler<GetAreaByIdQuery, AreaDto?>
{
    private readonly IApplicationDbContext _context;

    public GetAreaByIdQueryHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<AreaDto?> Handle(
        GetAreaByIdQuery request,
        CancellationToken cancellationToken)
    {
        return await _context.Areas
            .Where(x => x.Id == request.Id && x.IsActive)
            .Select(x => new AreaDto
            {
                Id = x.Id,
                Name = x.Name,
                Description = x.Description,
                IsActive = x.IsActive,
                CreatedAt = x.CreatedAt,
                UpdatedAt = x.UpdatedAt
            })
            .FirstOrDefaultAsync(cancellationToken);
    }
}