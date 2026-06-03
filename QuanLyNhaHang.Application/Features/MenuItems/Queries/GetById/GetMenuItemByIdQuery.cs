using MediatR;
using QuanLyNhaHang.Application.Features.MenuItems.DTOs;

namespace QuanLyNhaHang.Application.Features.MenuItems.Queries.GetById;

public class GetMenuItemByIdQuery : IRequest<MenuItemDto?>
{
    public Guid Id { get; set; }

    public GetMenuItemByIdQuery(Guid id)
    {
        Id = id;
    }
}