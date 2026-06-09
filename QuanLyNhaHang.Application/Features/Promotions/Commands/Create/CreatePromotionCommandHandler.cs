using MediatR;
using Microsoft.EntityFrameworkCore;
using QuanLyNhaHang.Application.Common.Interfaces;
using QuanLyNhaHang.Application.Features.Promotions.DTOs;
using QuanLyNhaHang.Domain.Entities;

namespace QuanLyNhaHang.Application.Features.Promotions.Commands.Create;

public class CreatePromotionCommandHandler
    : IRequestHandler<CreatePromotionCommand, PromotionDto>
{
    private readonly IApplicationDbContext _context;

    public CreatePromotionCommandHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<PromotionDto> Handle(
        CreatePromotionCommand request,
        CancellationToken cancellationToken)
    {
        var promotionCode = request.PromotionCode.Trim().ToUpper();

        var existedPromotion = await _context.Promotions
            .AnyAsync(x => x.PromotionCode == promotionCode, cancellationToken);

        if (existedPromotion)
            throw new Exception("Mã khuyến mãi đã tồn tại.");

        var promotion = new Promotion(
            promotionCode,
            request.Name,
            request.Description,
            request.DiscountType,
            request.DiscountValue,
            request.MinimumOrderAmount,
            request.MaximumDiscountAmount,
            request.StartDate,
            request.EndDate,
            request.UsageLimit);

        await _context.Promotions.AddAsync(promotion, cancellationToken);

        await _context.SaveChangesAsync(cancellationToken);

        return new PromotionDto
        {
            Id = promotion.Id,
            PromotionCode = promotion.PromotionCode,
            Name = promotion.Name,
            Description = promotion.Description,
            DiscountType = promotion.DiscountType,
            DiscountValue = promotion.DiscountValue,
            MinimumOrderAmount = promotion.MinimumOrderAmount,
            MaximumDiscountAmount = promotion.MaximumDiscountAmount,
            StartDate = promotion.StartDate,
            EndDate = promotion.EndDate,
            UsageLimit = promotion.UsageLimit,
            UsedCount = promotion.UsedCount,
            IsActive = promotion.IsActive,
            CreatedAt = promotion.CreatedAt,
            UpdatedAt = promotion.UpdatedAt
        };
    }
}