using MediatR;
using QuanLyNhaHang.Application.Features.MenuItems.DTOs;

namespace QuanLyNhaHang.Application.Features.MenuItems.Queries.GetList;

public class GetMenuItemListQuery : IRequest<List<MenuItemDto>>
{
}