using MediatR;
using Microsoft.EntityFrameworkCore;
using QuanLyNhaHang.Application.Common.Interfaces;

namespace QuanLyNhaHang.Application.Features.Areas.Commands.Update;

public class UpdateAreaCommandHandler : IRequestHandler<UpdateAreaCommand, bool>
{
    private readonly IApplicationDbContext _context;

    public UpdateAreaCommandHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<bool> Handle(
        UpdateAreaCommand request,
        CancellationToken cancellationToken)
    {
        var area = await _context.Areas
            .FirstOrDefaultAsync(
                x => x.Id == request.Id && x.IsActive,
                cancellationToken);

        if (area == null)
        {
            return false;
        }

        var name = request.Name.Trim();

        var nameExists = await _context.Areas
            .AnyAsync(
                x => x.Name == name &&
                     x.Id != request.Id &&
                     x.IsActive,
                cancellationToken);

        if (nameExists)
        {
            throw new Exception("Tên khu vực đã tồn tại.");
        }

        area.UpdateInfo(
            name,
            request.Description);

        await _context.SaveChangesAsync(cancellationToken);

        return true;
    }
}