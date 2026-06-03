using MediatR;
using Microsoft.EntityFrameworkCore;
using QuanLyNhaHang.Application.Common.Interfaces;
using QuanLyNhaHang.Domain.Entities;

namespace QuanLyNhaHang.Application.Features.MenuCategories.Commands.Create;

public class CreateMenuCategoryCommandHandler
    : IRequestHandler<CreateMenuCategoryCommand, Guid>
{
    private readonly IApplicationDbContext _context;

    public CreateMenuCategoryCommandHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<Guid> Handle(
        CreateMenuCategoryCommand request,
        CancellationToken cancellationToken)
    {
        var name = request.Name.Trim();

        var nameExists = await _context.MenuCategories
            .AnyAsync(x => x.Name == name, cancellationToken);

        if (nameExists)
        {
            throw new Exception("Tên danh mục món ăn đã tồn tại.");
        }

        var menuCategory = new MenuCategory(
            name,
            request.Description,
            request.DisplayOrder);

        _context.MenuCategories.Add(menuCategory);

        await _context.SaveChangesAsync(cancellationToken);

        return menuCategory.Id;
    }
}