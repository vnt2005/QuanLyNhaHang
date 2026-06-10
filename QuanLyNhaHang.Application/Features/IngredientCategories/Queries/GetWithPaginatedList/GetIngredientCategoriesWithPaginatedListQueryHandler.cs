using MediatR;
using Microsoft.EntityFrameworkCore;
using QuanLyNhaHang.Application.Common.Interfaces;
using QuanLyNhaHang.Application.Common.Models;
using QuanLyNhaHang.Application.Features.IngredientCategories.DTOs;

namespace QuanLyNhaHang.Application.Features.IngredientCategories.Queries.GetWithPaginatedList;

public class GetIngredientCategoriesWithPaginatedListQueryHandler
    : IRequestHandler<GetIngredientCategoriesWithPaginatedListQuery, PaginatedList<IngredientCategoryDto>>
{
    private readonly IApplicationDbContext _context;

    public GetIngredientCategoriesWithPaginatedListQueryHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<PaginatedList<IngredientCategoryDto>> Handle(
        GetIngredientCategoriesWithPaginatedListQuery request,
        CancellationToken cancellationToken)
    {
        var query = _context.IngredientCategories
            .AsNoTracking()
            .AsQueryable();

        if (!string.IsNullOrWhiteSpace(request.Keyword))
        {
            var keyword = request.Keyword.Trim();

            query = query.Where(x =>
                x.Name.Contains(keyword) ||
                (x.Description != null && x.Description.Contains(keyword)));
        }

        if (request.IsActive.HasValue)
        {
            query = query.Where(x => x.IsActive == request.IsActive.Value);
        }

        var ingredientCategoryDtos = query
            .OrderByDescending(x => x.CreatedAt)
            .Select(x => new IngredientCategoryDto
            {
                Id = x.Id,
                Name = x.Name,
                Description = x.Description,
                IsActive = x.IsActive,
                CreatedAt = x.CreatedAt,
                UpdatedAt = x.UpdatedAt
            });

        return await PaginatedList<IngredientCategoryDto>.CreateAsync(
            ingredientCategoryDtos,
            request.PageNumber,
            request.PageSize);
    }
}