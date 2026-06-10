using MediatR;

namespace QuanLyNhaHang.Application.Features.IngredientCategories.Commands.Delete;

public class DeleteIngredientCategoryCommand : IRequest<bool>
{
    public Guid Id { get; set; }
}