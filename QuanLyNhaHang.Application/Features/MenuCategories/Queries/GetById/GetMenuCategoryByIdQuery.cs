using MediatR;
using QuanLyNhaHang.Application.Features.MenuCategories.DTOs;

namespace QuanLyNhaHang.Application.Features.MenuCategories.Queries.GetById;

public class GetMenuCategoryByIdQuery : IRequest<MenuCategoryDto?>
{
    public Guid Id { get; set; }

    public GetMenuCategoryByIdQuery(Guid id)
    {
        Id = id;
    }
}