using MediatR;
using Microsoft.EntityFrameworkCore;
using QuanLyNhaHang.Application.Common.Interfaces;
using QuanLyNhaHang.Application.Features.Promotions.DTOs;

namespace QuanLyNhaHang.Application.Features.Promotions.Commands.Update;

public class UpdatePromotionCommandHandler
    : IRequestHandler<UpdatePromotionCommand, PromotionDto>
{
    private readonly IApplicationDbContext _context;

    public UpdatePromotionCommandHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<PromotionDto> Handle(
        UpdatePromotionCommand request,
        CancellationToken cancellationToken)
    {
        var promotion = await _context.Promotions
            .FirstOrDefaultAsync(x => x.Id == request.Id, cancellationToken);

        if (promotion == null)
            throw new Exception("Không tìm thấy khuyến mãi.");

        promotion.UpdateInfo(
            request.Name,
            request.Description,
            request.DiscountType,
            request.DiscountValue,
            request.MinimumOrderAmount,
            request.MaximumDiscountAmount,
            request.StartDate,
            request.EndDate,
            request.UsageLimit);

        if (request.IsActive)
            promotion.Activate();
        else
            promotion.Deactivate();

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