using MediatR;
using Microsoft.EntityFrameworkCore;
using QuanLyNhaHang.Application.Common.Interfaces;

namespace QuanLyNhaHang.Application.Features.MenuCategories.Commands.Delete;

public class DeleteMenuCategoryCommandHandler
    : IRequestHandler<DeleteMenuCategoryCommand, bool>
{
    private readonly IApplicationDbContext _context;

    public DeleteMenuCategoryCommandHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<bool> Handle(
        DeleteMenuCategoryCommand request,
        CancellationToken cancellationToken)
    {
        var menuCategory = await _context.MenuCategories
            .FirstOrDefaultAsync(x => x.Id == request.Id, cancellationToken);

        if (menuCategory == null)
        {
            return false;
        }

        menuCategory.Deactivate();

        await _context.SaveChangesAsync(cancellationToken);

        return true;
    }
}