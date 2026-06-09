using MediatR;
using Microsoft.EntityFrameworkCore;
using QuanLyNhaHang.Application.Common.Interfaces;
using QuanLyNhaHang.Application.Features.PromotionUsages.DTOs;

namespace QuanLyNhaHang.Application.Features.PromotionUsages.Commands.Update;

public class UpdatePromotionUsagePaymentCommandHandler
    : IRequestHandler<UpdatePromotionUsagePaymentCommand, PromotionUsageDto>
{
    private readonly IApplicationDbContext _context;

    public UpdatePromotionUsagePaymentCommandHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<PromotionUsageDto> Handle(
        UpdatePromotionUsagePaymentCommand request,
        CancellationToken cancellationToken)
    {
        var promotionUsage = await _context.PromotionUsages
            .FirstOrDefaultAsync(x => x.Id == request.Id, cancellationToken);

        if (promotionUsage == null)
            throw new Exception("Không tìm thấy lịch sử sử dụng khuyến mãi.");

        if (promotionUsage.Status == "Cancelled")
            throw new Exception("Lịch sử sử dụng khuyến mãi đã bị hủy.");

        var payment = await _context.Payments
            .FirstOrDefaultAsync(x => x.Id == request.PaymentId, cancellationToken);

        if (payment == null)
            throw new Exception("Không tìm thấy thanh toán.");

        if (payment.OrderId != promotionUsage.OrderId)
            throw new Exception("Thanh toán không thuộc order đã áp dụng khuyến mãi.");

        promotionUsage.SetPayment(payment.Id);

        await _context.SaveChangesAsync(cancellationToken);

        var promotion = await _context.Promotions
            .AsNoTracking()
            .FirstOrDefaultAsync(x => x.Id == promotionUsage.PromotionId, cancellationToken);

        var order = await _context.Orders
            .AsNoTracking()
            .FirstOrDefaultAsync(x => x.Id == promotionUsage.OrderId, cancellationToken);

        return new PromotionUsageDto
        {
            Id = promotionUsage.Id,
            PromotionId = promotionUsage.PromotionId,
            PromotionCode = promotionUsage.PromotionCode,
            PromotionName = promotion?.Name ?? string.Empty,
            OrderId = promotionUsage.OrderId,
            OrderCode = order?.OrderCode ?? string.Empty,
            PaymentId = promotionUsage.PaymentId,
            PaymentCode = payment.PaymentCode,
            OrderAmount = promotionUsage.OrderAmount,
            DiscountAmount = promotionUsage.DiscountAmount,
            Status = promotionUsage.Status,
            Note = promotionUsage.Note,
            UsedAt = promotionUsage.UsedAt,
            CancelledAt = promotionUsage.CancelledAt
        };
    }
}