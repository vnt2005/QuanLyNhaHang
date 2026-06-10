using MediatR;
using QuanLyNhaHang.Application.Features.IngredientCategories.DTOs;

namespace QuanLyNhaHang.Application.Features.IngredientCategories.Queries.GetById;

public class GetIngredientCategoryByIdQuery : IRequest<IngredientCategoryDto?>
{
    public Guid Id { get; set; }
}