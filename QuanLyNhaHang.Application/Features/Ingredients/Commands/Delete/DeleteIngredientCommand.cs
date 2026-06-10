using MediatR;

namespace QuanLyNhaHang.Application.Features.Ingredients.Commands.Delete;

public class DeleteIngredientCommand : IRequest<bool>
{
    public Guid Id { get; set; }
}