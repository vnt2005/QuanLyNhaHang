using MediatR;
using Microsoft.EntityFrameworkCore;
using QuanLyNhaHang.Application.Common.Interfaces;

namespace QuanLyNhaHang.Application.Features.MenuCategories.Commands.ChangeStatus;

public class ChangeMenuCategoryStatusCommandHandler
    : IRequestHandler<ChangeMenuCategoryStatusCommand, bool>
{
    private readonly IApplicationDbContext _context;

    public ChangeMenuCategoryStatusCommandHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<bool> Handle(
        ChangeMenuCategoryStatusCommand request,
        CancellationToken cancellationToken)
    {
        var menuCategory = await _context.MenuCategories
            .FirstOrDefaultAsync(x => x.Id == request.Id, cancellationToken);

        if (menuCategory == null)
        {
            return false;
        }

        if (request.IsActive)
        {
            menuCategory.Activate();
        }
        else
        {
            menuCategory.Deactivate();
        }

        await _context.SaveChangesAsync(cancellationToken);

        return true;
    }
}
