using MediatR;
using QuanLyNhaHang.Application.Common.Models;
using QuanLyNhaHang.Application.Features.Ingredients.DTOs;

namespace QuanLyNhaHang.Application.Features.Ingredients.Queries.GetWithPaginatedList;

public class GetIngredientsWithPaginatedListQuery
    : IRequest<PaginatedList<IngredientDto>>
{
    public string? Keyword { get; set; }

    public Guid? IngredientCategoryId { get; set; }

    public bool? IsActive { get; set; }

    public bool? IsLowStock { get; set; }

    public int PageNumber { get; set; } = 1;

    public int PageSize { get; set; } = 10;
}