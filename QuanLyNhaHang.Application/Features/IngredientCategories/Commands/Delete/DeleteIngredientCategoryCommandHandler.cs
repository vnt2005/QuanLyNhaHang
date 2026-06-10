using MediatR;
using Microsoft.EntityFrameworkCore;
using QuanLyNhaHang.Application.Common.Interfaces;

namespace QuanLyNhaHang.Application.Features.IngredientCategories.Commands.Delete;

public class DeleteIngredientCategoryCommandHandler
    : IRequestHandler<DeleteIngredientCategoryCommand, bool>
{
    private readonly IApplicationDbContext _context;

    public DeleteIngredientCategoryCommandHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<bool> Handle(
        DeleteIngredientCategoryCommand request,
        CancellationToken cancellationToken)
    {
        var category = await _context.IngredientCategories
            .FirstOrDefaultAsync(x => x.Id == request.Id, cancellationToken);

        if (category == null)
            throw new Exception("Không tìm thấy danh mục nguyên liệu.");

        var hasIngredients = await _context.Ingredients
            .AnyAsync(x =>
                x.IngredientCategoryId == category.Id &&
                x.IsActive,
                cancellationToken);

        if (hasIngredients)
            throw new Exception("Danh mục này đang có nguyên liệu, không thể vô hiệu hóa.");

        category.Deactivate();

        await _context.SaveChangesAsync(cancellationToken);

        return true;
    }
}