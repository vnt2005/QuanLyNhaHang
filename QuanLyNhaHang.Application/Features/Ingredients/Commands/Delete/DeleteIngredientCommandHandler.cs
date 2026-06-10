using MediatR;
using Microsoft.EntityFrameworkCore;
using QuanLyNhaHang.Application.Common.Interfaces;

namespace QuanLyNhaHang.Application.Features.Ingredients.Commands.Delete;

public class DeleteIngredientCommandHandler
    : IRequestHandler<DeleteIngredientCommand, bool>
{
    private readonly IApplicationDbContext _context;

    public DeleteIngredientCommandHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<bool> Handle(
        DeleteIngredientCommand request,
        CancellationToken cancellationToken)
    {
        var ingredient = await _context.Ingredients
            .FirstOrDefaultAsync(x => x.Id == request.Id, cancellationToken);

        if (ingredient == null)
            throw new Exception("Không tìm thấy nguyên liệu.");

        ingredient.Deactivate();

        await _context.SaveChangesAsync(cancellationToken);

        return true;
    }
}