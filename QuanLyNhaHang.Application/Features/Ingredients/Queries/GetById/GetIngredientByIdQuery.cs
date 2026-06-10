using MediatR;
using QuanLyNhaHang.Application.Features.Ingredients.DTOs;

namespace QuanLyNhaHang.Application.Features.Ingredients.Queries.GetById;

public class GetIngredientByIdQuery : IRequest<IngredientDto?>
{
    public Guid Id { get; set; }
}