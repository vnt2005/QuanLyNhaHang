using MediatR;
using Microsoft.EntityFrameworkCore;
using QuanLyNhaHang.Application.Common.Interfaces;
using QuanLyNhaHang.Application.Features.ActivityLogs.DTOs;

namespace QuanLyNhaHang.Application.Features.ActivityLogs.Queries.GetById;

public class GetActivityLogByIdQueryHandler
    : IRequestHandler<GetActivityLogByIdQuery, ActivityLogDto?>
{
    private readonly IApplicationDbContext _context;

    public GetActivityLogByIdQueryHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<ActivityLogDto?> Handle(
        GetActivityLogByIdQuery request,
        CancellationToken cancellationToken)
    {
        var result = await _context.ActivityLogs
            .AsNoTracking()
            .Where(x => x.Id == request.Id)
            .Select(x => new ActivityLogDto
            {
                Id = x.Id,
                UserId = x.UserId,
                UserName = x.UserName,
                Action = x.Action,
                ModuleName = x.ModuleName,
                EntityName = x.EntityName,
                EntityId = x.EntityId,
                Description = x.Description,
                OldValues = x.OldValues,
                NewValues = x.NewValues,
                IpAddress = x.IpAddress,
                UserAgent = x.UserAgent,
                Status = x.Status,
                CreatedAt = x.CreatedAt
            })
            .FirstOrDefaultAsync(cancellationToken);

        return result;
    }
}