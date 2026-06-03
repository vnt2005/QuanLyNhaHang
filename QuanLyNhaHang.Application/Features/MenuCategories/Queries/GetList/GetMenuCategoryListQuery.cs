using MediatR;
using QuanLyNhaHang.Application.Features.MenuCategories.DTOs;

namespace QuanLyNhaHang.Application.Features.MenuCategories.Queries.GetList;

public class GetMenuCategoryListQuery : IRequest<List<MenuCategoryDto>>
{
}