using MediatR;
using QuanLyNhaHang.Application.Common.Models;
using QuanLyNhaHang.Application.Features.MenuCategories.DTOs;

namespace QuanLyNhaHang.Application.Features.MenuCategories.Queries.GetWithPaginatedList;

public class GetMenuCategoriesWithPaginatedListQuery : IRequest<PaginatedList<MenuCategoryDto>>
{
    public string? Keyword { get; set; }

    public bool? IsActive { get; set; }

    public int PageNumber { get; set; } = 1;

    public int PageSize { get; set; } = 10;
}
