using MediatR;

namespace QuanLyNhaHang.Application.Features.MenuItems.Commands.Create;

public class CreateMenuItemCommand : IRequest<Guid>
{
    public Guid MenuCategoryId { get; set; }

    public string Name { get; set; } = string.Empty;

    public string? Description { get; set; }

    public decimal Price { get; set; }

    public string? ImageUrl { get; set; }
}