using MediatR;
using Microsoft.EntityFrameworkCore;
using QuanLyNhaHang.Application.Common.Interfaces;
using QuanLyNhaHang.Application.Features.PromotionUsages.DTOs;

namespace QuanLyNhaHang.Application.Features.PromotionUsages.Queries.GetById;

public class GetPromotionUsageByIdQueryHandler
    : IRequestHandler<GetPromotionUsageByIdQuery, PromotionUsageDto?>
{
    private readonly IApplicationDbContext _context;

    public GetPromotionUsageByIdQueryHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<PromotionUsageDto?> Handle(
        GetPromotionUsageByIdQuery request,
        CancellationToken cancellationToken)
    {
        var result = await (
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
            where usage.Id == request.Id
            select new PromotionUsageDto
            {
                Id = usage.Id,
                PromotionId = usage.PromotionId,
                PromotionCode = usage.PromotionCode,
                PromotionName = promotion != null ? promotion.Name : string.Empty,
                OrderId = usage.OrderId,
                OrderCode = order != null ? order.OrderCode : string.Empty,
                PaymentId = usage.PaymentId,
                PaymentCode = payment != null ? payment.PaymentCode : null,
                OrderAmount = usage.OrderAmount,
                DiscountAmount = usage.DiscountAmount,
                Status = usage.Status,
                Note = usage.Note,
                UsedAt = usage.UsedAt,
                CancelledAt = usage.CancelledAt
            })
            .FirstOrDefaultAsync(cancellationToken);

        return result;
    }
}