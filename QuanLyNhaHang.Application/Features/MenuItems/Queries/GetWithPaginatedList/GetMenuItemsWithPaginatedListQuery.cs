using MediatR;
using QuanLyNhaHang.Application.Common.Models;
using QuanLyNhaHang.Application.Features.MenuItems.DTOs;

namespace QuanLyNhaHang.Application.Features.MenuItems.Queries.GetWithPaginatedList;

public class GetMenuItemsWithPaginatedListQuery : IRequest<PaginatedList<MenuItemDto>>
{
    public string? Keyword { get; set; }

    public Guid? MenuCategoryId { get; set; }

    public bool? IsAvailable { get; set; }

    public bool? IsActive { get; set; }

    public int PageNumber { get; set; } = 1;

    public int PageSize { get; set; } = 10;
}
