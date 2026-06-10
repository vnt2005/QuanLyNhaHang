using MediatR;
using Microsoft.EntityFrameworkCore;
using QuanLyNhaHang.Application.Common.Interfaces;
using QuanLyNhaHang.Application.Features.ActivityLogs.DTOs;

namespace QuanLyNhaHang.Application.Features.ActivityLogs.Queries.GetList;

public class GetActivityLogsQueryHandler
    : IRequestHandler<GetActivityLogsQuery, List<ActivityLogDto>>
{
    private readonly IApplicationDbContext _context;

    public GetActivityLogsQueryHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<List<ActivityLogDto>> Handle(
        GetActivityLogsQuery request,
        CancellationToken cancellationToken)
    {
        var query = _context.ActivityLogs
            .AsNoTracking()
            .AsQueryable();

        if (request.UserId.HasValue)
        {
            query = query.Where(x => x.UserId == request.UserId.Value);
        }

        if (!string.IsNullOrWhiteSpace(request.Action))
        {
            var action = request.Action.Trim();

            query = query.Where(x => x.Action == action);
        }

        if (!string.IsNullOrWhiteSpace(request.ModuleName))
        {
            var moduleName = request.ModuleName.Trim();

            query = query.Where(x => x.ModuleName == moduleName);
        }

        if (!string.IsNullOrWhiteSpace(request.EntityName))
        {
            var entityName = request.EntityName.Trim();

            query = query.Where(x => x.EntityName == entityName);
        }

        if (request.EntityId.HasValue)
        {
            query = query.Where(x => x.EntityId == request.EntityId.Value);
        }

        if (!string.IsNullOrWhiteSpace(request.Status))
        {
            var status = request.Status.Trim();

            query = query.Where(x => x.Status == status);
        }

        if (request.FromDate.HasValue)
        {
            query = query.Where(x => x.CreatedAt >= request.FromDate.Value);
        }

        if (request.ToDate.HasValue)
        {
            query = query.Where(x => x.CreatedAt <= request.ToDate.Value);
        }

        var result = await query
            .OrderByDescending(x => x.CreatedAt)
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
            .ToListAsync(cancellationToken);

        return result;
    }
}