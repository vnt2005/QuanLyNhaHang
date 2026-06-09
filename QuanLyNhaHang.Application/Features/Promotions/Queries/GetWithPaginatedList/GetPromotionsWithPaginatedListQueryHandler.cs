using MediatR;
using Microsoft.EntityFrameworkCore;
using QuanLyNhaHang.Application.Common.Interfaces;
using QuanLyNhaHang.Application.Common.Models;
using QuanLyNhaHang.Application.Features.Promotions.DTOs;

namespace QuanLyNhaHang.Application.Features.Promotions.Queries.GetWithPaginatedList;

public class GetPromotionsWithPaginatedListQueryHandler
    : IRequestHandler<GetPromotionsWithPaginatedListQuery, PaginatedList<PromotionDto>>
{
    private readonly IApplicationDbContext _context;

    public GetPromotionsWithPaginatedListQueryHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<PaginatedList<PromotionDto>> Handle(
        GetPromotionsWithPaginatedListQuery request,
        CancellationToken cancellationToken)
    {
        var query = _context.Promotions
            .AsNoTracking()
            .AsQueryable();

        if (!string.IsNullOrWhiteSpace(request.Keyword))
        {
            var keyword = request.Keyword.Trim();

            query = query.Where(x =>
                x.PromotionCode.Contains(keyword) ||
                x.Name.Contains(keyword) ||
                (x.Description != null && x.Description.Contains(keyword)));
        }

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

        var promotionDtos = query
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
            });

        return await PaginatedList<PromotionDto>.CreateAsync(
            promotionDtos,
            request.PageNumber,
            request.PageSize);
    }
}