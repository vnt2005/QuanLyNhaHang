using MediatR;

namespace QuanLyNhaHang.Application.Features.MenuCategories.Commands.ChangeStatus;

public class ChangeMenuCategoryStatusCommand : IRequest<bool>
{
    public Guid Id { get; set; }

    public bool IsActive { get; set; }
}
