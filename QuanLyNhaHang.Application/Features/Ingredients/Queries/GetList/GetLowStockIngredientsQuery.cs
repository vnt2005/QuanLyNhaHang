using MediatR;
using QuanLyNhaHang.Application.Features.Ingredients.DTOs;

namespace QuanLyNhaHang.Application.Features.Ingredients.Queries.GetList;

public class GetLowStockIngredientsQuery : IRequest<List<LowStockIngredientDto>>
{
}