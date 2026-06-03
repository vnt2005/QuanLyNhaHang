using MediatR;

namespace QuanLyNhaHang.Application.Features.MenuItems.Commands.Delete;

public class DeleteMenuItemCommand : IRequest<bool>
{
    public Guid Id { get; set; }

    public DeleteMenuItemCommand(Guid id)
    {
        Id = id;
    }
}