using MediatR;
using Microsoft.EntityFrameworkCore;
using QuanLyNhaHang.Application.Common.Interfaces;
using QuanLyNhaHang.Domain.Entities;

namespace QuanLyNhaHang.Application.Features.MenuItems.Commands.Create;

public class CreateMenuItemCommandHandler
    : IRequestHandler<CreateMenuItemCommand, Guid>
{
    private readonly IApplicationDbContext _context;

    public CreateMenuItemCommandHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<Guid> Handle(
        CreateMenuItemCommand request,
        CancellationToken cancellationToken)
    {
        var categoryExists = await _context.MenuCategories
            .AnyAsync(
                x => x.Id == request.MenuCategoryId && x.IsActive,
                cancellationToken);

        if (!categoryExists)
        {
            throw new Exception("Danh mục món ăn không tồn tại hoặc đã ngừng hoạt động.");
        }

        var name = request.Name.Trim();

        var menuItemExists = await _context.MenuItems
            .AnyAsync(
                x => x.MenuCategoryId == request.MenuCategoryId &&
                     x.Name == name,
                cancellationToken);

        if (menuItemExists)
        {
            throw new Exception("Tên món ăn đã tồn tại trong danh mục này.");
        }

        var menuItem = new MenuItem(
            request.MenuCategoryId,
            name,
            request.Description,
            request.Price,
            request.ImageUrl);

        _context.MenuItems.Add(menuItem);

        await _context.SaveChangesAsync(cancellationToken);

        return menuItem.Id;
    }
}