using MediatR;
using Microsoft.EntityFrameworkCore;
using QuanLyNhaHang.Application.Common.Interfaces;
using QuanLyNhaHang.Application.Features.Promotions.DTOs;
using QuanLyNhaHang.Domain.Entities;

namespace QuanLyNhaHang.Application.Features.Promotions.Commands.Create;

public class ApplyPromotionCommandHandler
    : IRequestHandler<ApplyPromotionCommand, ApplyPromotionResultDto>
{
    private readonly IApplicationDbContext _context;

    public ApplyPromotionCommandHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<ApplyPromotionResultDto> Handle(
        ApplyPromotionCommand request,
        CancellationToken cancellationToken)
    {
        var order = await _context.Orders
            .FirstOrDefaultAsync(x => x.Id == request.OrderId, cancellationToken);

        if (order == null)
            throw new Exception("Không tìm thấy order.");

        if (order.Status == "Completed" || order.Status == "Cancelled")
            throw new Exception("Order đã hoàn tất hoặc đã hủy, không thể áp dụng khuyến mãi.");

        var promotionCode = request.PromotionCode.Trim().ToUpper();

        var promotion = await _context.Promotions
            .FirstOrDefaultAsync(x => x.PromotionCode == promotionCode, cancellationToken);

        if (promotion == null)
            throw new Exception("Không tìm thấy mã khuyến mãi.");

        var existedAppliedPromotion = await _context.PromotionUsages
            .AnyAsync(x =>
                x.OrderId == order.Id &&
                x.Status == "Applied",
                cancellationToken);

        if (existedAppliedPromotion)
            throw new Exception("Order này đã được áp dụng khuyến mãi.");

        var orderItems = await _context.OrderItems
            .Where(x =>
                x.OrderId == order.Id &&
                x.Status != "Cancelled")
            .ToListAsync(cancellationToken);

        if (!orderItems.Any())
            throw new Exception("Order không có món hợp lệ để áp dụng khuyến mãi.");

        var orderAmount = orderItems.Sum(x => x.TotalPrice);

        var discountAmount = promotion.CalculateDiscountAmount(orderAmount);

        var promotionUsage = new PromotionUsage(
            promotion.Id,
            order.Id,
            null,
            promotion.PromotionCode,
            orderAmount,
            discountAmount,
            request.Note);

        promotion.IncreaseUsedCount();

        await _context.PromotionUsages.AddAsync(promotionUsage, cancellationToken);

        await _context.SaveChangesAsync(cancellationToken);

        return new ApplyPromotionResultDto
        {
            PromotionId = promotion.Id,
            PromotionCode = promotion.PromotionCode,
            PromotionName = promotion.Name,
            DiscountType = promotion.DiscountType,
            DiscountValue = promotion.DiscountValue,
            OrderId = order.Id,
            OrderAmount = orderAmount,
            DiscountAmount = discountAmount,
            FinalAmount = orderAmount - discountAmount,
            PromotionUsageId = promotionUsage.Id,
            Note = promotionUsage.Note
        };
    }
}