using MediatR;

namespace QuanLyNhaHang.Application.Features.MenuCategories.Commands.Update;

public class UpdateMenuCategoryCommand : IRequest<bool>
{
    public Guid Id { get; set; }

    public string Name { get; set; } = string.Empty;

    public string? Description { get; set; }

    public int DisplayOrder { get; set; }
}