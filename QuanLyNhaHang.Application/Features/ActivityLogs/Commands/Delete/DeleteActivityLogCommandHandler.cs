using MediatR;
using Microsoft.EntityFrameworkCore;
using QuanLyNhaHang.Application.Common.Interfaces;

namespace QuanLyNhaHang.Application.Features.ActivityLogs.Commands.Delete;

public class DeleteActivityLogCommandHandler
    : IRequestHandler<DeleteActivityLogCommand, bool>
{
    private readonly IApplicationDbContext _context;

    public DeleteActivityLogCommandHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<bool> Handle(
        DeleteActivityLogCommand request,
        CancellationToken cancellationToken)
    {
        var activityLog = await _context.ActivityLogs
            .FirstOrDefaultAsync(x => x.Id == request.Id, cancellationToken);

        if (activityLog == null)
            throw new Exception("Không tìm thấy nhật ký hoạt động.");

        _context.ActivityLogs.Remove(activityLog);

        await _context.SaveChangesAsync(cancellationToken);

        return true;
    }
}