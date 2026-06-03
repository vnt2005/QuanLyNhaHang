using MediatR;

namespace QuanLyNhaHang.Application.Features.MenuCategories.Commands.Delete;

public class DeleteMenuCategoryCommand : IRequest<bool>
{
    public Guid Id { get; set; }

    public DeleteMenuCategoryCommand(Guid id)
    {
        Id = id;
    }
}