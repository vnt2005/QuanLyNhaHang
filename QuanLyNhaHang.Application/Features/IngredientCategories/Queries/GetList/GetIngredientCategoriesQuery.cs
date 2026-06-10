using MediatR;
using QuanLyNhaHang.Application.Features.IngredientCategories.DTOs;

namespace QuanLyNhaHang.Application.Features.IngredientCategories.Queries.GetList;

public class GetIngredientCategoriesQuery : IRequest<List<IngredientCategoryDto>>
{
    public bool? IsActive { get; set; }
}