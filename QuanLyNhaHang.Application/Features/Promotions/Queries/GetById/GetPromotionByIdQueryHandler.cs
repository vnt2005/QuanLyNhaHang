using MediatR;
using Microsoft.EntityFrameworkCore;
using QuanLyNhaHang.Application.Common.Interfaces;
using QuanLyNhaHang.Application.Features.Promotions.DTOs;

namespace QuanLyNhaHang.Application.Features.Promotions.Queries.GetById;

public class GetPromotionByIdQueryHandler
    : IRequestHandler<GetPromotionByIdQuery, PromotionDto?>
{
    private readonly IApplicationDbContext _context;

    public GetPromotionByIdQueryHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<PromotionDto?> Handle(
        GetPromotionByIdQuery request,
        CancellationToken cancellationToken)
    {
        var result = await _context.Promotions
            .AsNoTracking()
            .Where(x => x.Id == request.Id)
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
            .FirstOrDefaultAsync(cancellationToken);

        return result;
    }
}