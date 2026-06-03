using MediatR;
using Microsoft.EntityFrameworkCore;
using QuanLyNhaHang.Application.Common.Interfaces;

namespace QuanLyNhaHang.Application.Features.MenuCategories.Commands.Update;

public class UpdateMenuCategoryCommandHandler
    : IRequestHandler<UpdateMenuCategoryCommand, bool>
{
    private readonly IApplicationDbContext _context;

    public UpdateMenuCategoryCommandHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<bool> Handle(
        UpdateMenuCategoryCommand request,
        CancellationToken cancellationToken)
    {
        var menuCategory = await _context.MenuCategories
            .FirstOrDefaultAsync(x => x.Id == request.Id, cancellationToken);

        if (menuCategory == null)
        {
            return false;
        }

        var name = request.Name.Trim();

        var nameExists = await _context.MenuCategories
            .AnyAsync(
                x => x.Name == name && x.Id != request.Id,
                cancellationToken);

        if (nameExists)
        {
            throw new Exception("Tên danh mục món ăn đã tồn tại.");
        }

        menuCategory.UpdateInfo(
            name,
            request.Description,
            request.DisplayOrder);

        await _context.SaveChangesAsync(cancellationToken);

        return true;
    }
}