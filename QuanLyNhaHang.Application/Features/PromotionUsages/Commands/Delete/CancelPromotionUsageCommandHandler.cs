using MediatR;
using Microsoft.EntityFrameworkCore;
using QuanLyNhaHang.Application.Common.Interfaces;

namespace QuanLyNhaHang.Application.Features.PromotionUsages.Commands.Delete;

public class CancelPromotionUsageCommandHandler
    : IRequestHandler<CancelPromotionUsageCommand, bool>
{
    private readonly IApplicationDbContext _context;

    public CancelPromotionUsageCommandHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<bool> Handle(
        CancelPromotionUsageCommand request,
        CancellationToken cancellationToken)
    {
        var promotionUsage = await _context.PromotionUsages
            .FirstOrDefaultAsync(x => x.Id == request.Id, cancellationToken);

        if (promotionUsage == null)
            throw new Exception("Không tìm thấy lịch sử sử dụng khuyến mãi.");

        if (promotionUsage.Status == "Cancelled")
            throw new Exception("Lịch sử sử dụng khuyến mãi đã được hủy trước đó.");

        var promotion = await _context.Promotions
            .FirstOrDefaultAsync(x => x.Id == promotionUsage.PromotionId, cancellationToken);

        if (promotion == null)
            throw new Exception("Không tìm thấy khuyến mãi.");

        promotionUsage.Cancel();

        promotion.DecreaseUsedCount();

        await _context.SaveChangesAsync(cancellationToken);

        return true;
    }
}