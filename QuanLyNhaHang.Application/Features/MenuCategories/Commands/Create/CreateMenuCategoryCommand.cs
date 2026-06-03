using MediatR;

namespace QuanLyNhaHang.Application.Features.MenuCategories.Commands.Create;

public class CreateMenuCategoryCommand : IRequest<Guid>
{
    public string Name { get; set; } = string.Empty;

    public string? Description { get; set; }

    public int DisplayOrder { get; set; }
}