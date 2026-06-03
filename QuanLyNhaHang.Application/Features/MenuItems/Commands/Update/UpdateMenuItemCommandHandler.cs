using MediatR;
using Microsoft.EntityFrameworkCore;
using QuanLyNhaHang.Application.Common.Interfaces;

namespace QuanLyNhaHang.Application.Features.MenuItems.Commands.Update;

public class UpdateMenuItemCommandHandler
    : IRequestHandler<UpdateMenuItemCommand, bool>
{
    private readonly IApplicationDbContext _context;

    public UpdateMenuItemCommandHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<bool> Handle(
        UpdateMenuItemCommand request,
        CancellationToken cancellationToken)
    {
        var menuItem = await _context.MenuItems
            .FirstOrDefaultAsync(x => x.Id == request.Id, cancellationToken);

        if (menuItem == null)
        {
            return false;
        }

        var categoryExists = await _context.MenuCategories
            .AnyAsync(
                x => x.Id == request.MenuCategoryId && x.IsActive,
                cancellationToken);

        if (!categoryExists)
        {
            throw new Exception("Danh mục món ăn không tồn tại hoặc đã ngừng hoạt động.");
        }

        var name = request.Name.Trim();

        var nameExists = await _context.MenuItems
            .AnyAsync(
                x => x.MenuCategoryId == request.MenuCategoryId &&
                     x.Name == name &&
                     x.Id != request.Id,
                cancellationToken);

        if (nameExists)
        {
            throw new Exception("Tên món ăn đã tồn tại trong danh mục này.");
        }

        menuItem.UpdateInfo(
            request.MenuCategoryId,
            name,
            request.Description,
            request.Price,
            request.ImageUrl);

        await _context.SaveChangesAsync(cancellationToken);

        return true;
    }
}