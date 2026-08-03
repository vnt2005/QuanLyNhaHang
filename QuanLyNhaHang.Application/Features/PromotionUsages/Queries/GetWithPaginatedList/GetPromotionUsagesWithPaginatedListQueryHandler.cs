using MediatR;
using Microsoft.EntityFrameworkCore;
using QuanLyNhaHang.Application.Common.Interfaces;
using QuanLyNhaHang.Application.Common.Models;
using QuanLyNhaHang.Application.Common.Time;
using QuanLyNhaHang.Application.Features.PromotionUsages.DTOs;

namespace QuanLyNhaHang.Application.Features.PromotionUsages.Queries.GetWithPaginatedList;

public class GetPromotionUsagesWithPaginatedListQueryHandler
    : IRequestHandler<GetPromotionUsagesWithPaginatedListQuery, PaginatedList<PromotionUsageDto>>
{
    private readonly IApplicationDbContext _context;

    public GetPromotionUsagesWithPaginatedListQueryHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<PaginatedList<PromotionUsageDto>> Handle(
        GetPromotionUsagesWithPaginatedListQuery request,
        CancellationToken cancellationToken)
    {
        var query =
            from usage in _context.PromotionUsages.AsNoTracking()
            join promotion in _context.Promotions.AsNoTracking()
                on usage.PromotionId equals promotion.Id into promotionGroup
            from promotion in promotionGroup.DefaultIfEmpty()
            join order in _context.Orders.AsNoTracking()
                on usage.OrderId equals order.Id into orderGroup
            from order in orderGroup.DefaultIfEmpty()
            join payment in _context.Payments.AsNoTracking()
                on usage.PaymentId equals (Guid?)payment.Id into paymentGroup
            from payment in paymentGroup.DefaultIfEmpty()
            select new
            {
                Usage = usage,
                Promotion = promotion,
                Order = order,
                Payment = payment
            };

        if (!string.IsNullOrWhiteSpace(request.Keyword))
        {
            var keyword = request.Keyword.Trim();
            query = query.Where(x =>
                x.Usage.PromotionCode.Contains(keyword) ||
                (x.Promotion != null && x.Promotion.Name.Contains(keyword)) ||
                (x.Order != null && x.Order.OrderCode.Contains(keyword)) ||
                (x.Payment != null && x.Payment.PaymentCode.Contains(keyword)));
        }

        if (request.PromotionId.HasValue)
            query = query.Where(x => x.Usage.PromotionId == request.PromotionId.Value);

        if (request.OrderId.HasValue)
            query = query.Where(x => x.Usage.OrderId == request.OrderId.Value);

        if (request.PaymentId.HasValue)
            query = query.Where(x => x.Usage.PaymentId == request.PaymentId.Value);

        if (!string.IsNullOrWhiteSpace(request.Status))
        {
            var status = request.Status.Trim();
            query = query.Where(x => x.Usage.Status == status);
        }

        if (request.FromDate.HasValue)
        {
            var fromUtc = RestaurantTime.GetUtcStart(request.FromDate.Value);
            query = query.Where(x => x.Usage.UsedAt >= fromUtc);
        }

        if (request.ToDate.HasValue)
        {
            var toUtcExclusive = RestaurantTime.GetUtcEndExclusive(request.ToDate.Value);
            query = query.Where(x => x.Usage.UsedAt < toUtcExclusive);
        }

        var promotionUsageDtos = query
            .OrderByDescending(x => x.Usage.UsedAt)
            .Select(x => new PromotionUsageDto
            {
                Id = x.Usage.Id,
                PromotionId = x.Usage.PromotionId,
                PromotionCode = x.Usage.PromotionCode,
                PromotionName = x.Promotion != null ? x.Promotion.Name : string.Empty,
                OrderId = x.Usage.OrderId,
                OrderCode = x.Order != null ? x.Order.OrderCode : string.Empty,
                PaymentId = x.Usage.PaymentId,
                PaymentCode = x.Payment != null ? x.Payment.PaymentCode : null,
                OrderAmount = x.Usage.OrderAmount,
                DiscountAmount = x.Usage.DiscountAmount,
                Status = x.Usage.Status,
                Note = x.Usage.Note,
                UsedAt = x.Usage.UsedAt,
                CancelledAt = x.Usage.CancelledAt
            });

        return await PaginatedList<PromotionUsageDto>.CreateAsync(
            promotionUsageDtos,
            request.PageNumber,
            request.PageSize);
    }
}
