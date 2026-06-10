using MediatR;
using Microsoft.EntityFrameworkCore;
using QuanLyNhaHang.Application.Common.Interfaces;
using QuanLyNhaHang.Application.Features.IngredientCategories.DTOs;

namespace QuanLyNhaHang.Application.Features.IngredientCategories.Queries.GetById;

public class GetIngredientCategoryByIdQueryHandler
    : IRequestHandler<GetIngredientCategoryByIdQuery, IngredientCategoryDto?>
{
    private readonly IApplicationDbContext _context;

    public GetIngredientCategoryByIdQueryHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<IngredientCategoryDto?> Handle(
        GetIngredientCategoryByIdQuery request,
        CancellationToken cancellationToken)
    {
        var result = await _context.IngredientCategories
            .AsNoTracking()
            .Where(x => x.Id == request.Id)
            .Select(x => new IngredientCategoryDto
            {
                Id = x.Id,
                Name = x.Name,
                Description = x.Description,
                IsActive = x.IsActive,
                CreatedAt = x.CreatedAt,
                UpdatedAt = x.UpdatedAt
            })
            .FirstOrDefaultAsync(cancellationToken);

        return result;
    }
}