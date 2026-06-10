using MediatR;
using QuanLyNhaHang.Application.Common.Models;
using QuanLyNhaHang.Application.Features.IngredientCategories.DTOs;

namespace QuanLyNhaHang.Application.Features.IngredientCategories.Queries.GetWithPaginatedList;

public class GetIngredientCategoriesWithPaginatedListQuery
    : IRequest<PaginatedList<IngredientCategoryDto>>
{
    public string? Keyword { get; set; }

    public bool? IsActive { get; set; }

    public int PageNumber { get; set; } = 1;

    public int PageSize { get; set; } = 10;
}