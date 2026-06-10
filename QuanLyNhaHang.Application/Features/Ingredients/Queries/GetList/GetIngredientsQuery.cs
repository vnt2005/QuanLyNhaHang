using MediatR;
using QuanLyNhaHang.Application.Features.Ingredients.DTOs;

namespace QuanLyNhaHang.Application.Features.Ingredients.Queries.GetList;

public class GetIngredientsQuery : IRequest<List<IngredientDto>>
{
    public Guid? IngredientCategoryId { get; set; }

    public bool? IsActive { get; set; }

    public bool? IsLowStock { get; set; }
}