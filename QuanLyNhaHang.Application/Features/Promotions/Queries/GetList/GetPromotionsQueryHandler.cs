using MediatR;
using Microsoft.EntityFrameworkCore;
using QuanLyNhaHang.Application.Common.Interfaces;
using QuanLyNhaHang.Application.Features.Promotions.DTOs;

namespace QuanLyNhaHang.Application.Features.Promotions.Queries.GetList;

public class GetPromotionsQueryHandler
    : IRequestHandler<GetPromotionsQuery, List<PromotionDto>>
{
    private readonly IApplicationDbContext _context;

    public GetPromotionsQueryHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<List<PromotionDto>> Handle(
        GetPromotionsQuery request,
        CancellationToken cancellationToken)
    {
        var query = _context.Promotions
            .AsNoTracking()
            .AsQueryable();

        if (!string.IsNullOrWhiteSpace(request.DiscountType))
        {
            query = query.Where(x => x.DiscountType == request.DiscountType);
        }

        if (request.IsActive.HasValue)
        {
            query = query.Where(x => x.IsActive == request.IsActive.Value);
        }

        if (request.IsValidNow.HasValue && request.IsValidNow.Value)
        {
            var now = DateTime.UtcNow;

            query = query.Where(x =>
                x.IsActive &&
                x.StartDate <= now &&
                x.EndDate >= now &&
                (!x.UsageLimit.HasValue || x.UsedCount < x.UsageLimit.Value));
        }

        var result = await query
            .OrderByDescending(x => x.CreatedAt)
            .Select(x => new PromotionDto
            {
                Id = x.Id,
                PromotionCode = x.PromotionCode,
                Name = x.Name,
                Description = x.Description,
                DiscountType = x.DiscountType,
                DiscountValue = x.DiscountValue,
                MinimumOrderAmount = x.MinimumOrderAmount,
                MaximumDiscountAmount = x.MaximumDiscountAmount,
                StartDate = x.StartDate,
                EndDate = x.EndDate,
                UsageLimit = x.UsageLimit,
                UsedCount = x.UsedCount,
                IsActive = x.IsActive,
                CreatedAt = x.CreatedAt,
                UpdatedAt = x.UpdatedAt
            })
            .ToListAsync(cancellationToken);

        return result;
    }
}