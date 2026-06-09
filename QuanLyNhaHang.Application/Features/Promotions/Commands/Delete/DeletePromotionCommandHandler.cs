using MediatR;
using Microsoft.EntityFrameworkCore;
using QuanLyNhaHang.Application.Common.Interfaces;

namespace QuanLyNhaHang.Application.Features.Promotions.Commands.Delete;

public class DeletePromotionCommandHandler
    : IRequestHandler<DeletePromotionCommand, bool>
{
    private readonly IApplicationDbContext _context;

    public DeletePromotionCommandHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<bool> Handle(
        DeletePromotionCommand request,
        CancellationToken cancellationToken)
    {
        var promotion = await _context.Promotions
            .FirstOrDefaultAsync(x => x.Id == request.Id, cancellationToken);

        if (promotion == null)
            throw new Exception("Không tìm thấy khuyến mãi.");

        promotion.Deactivate();

        await _context.SaveChangesAsync(cancellationToken);

        return true;
    }
}