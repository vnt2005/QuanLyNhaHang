using MediatR;
using Microsoft.EntityFrameworkCore;
using QuanLyNhaHang.Application.Common.Interfaces;
using QuanLyNhaHang.Application.Common.Time;
using QuanLyNhaHang.Application.Features.ActivityLogs.DTOs;

namespace QuanLyNhaHang.Application.Features.ActivityLogs.Queries.GetSummary;

public class GetActivityLogSummaryQueryHandler
    : IRequestHandler<GetActivityLogSummaryQuery, ActivityLogSummaryDto>
{
    private readonly IApplicationDbContext _context;

    public GetActivityLogSummaryQueryHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<ActivityLogSummaryDto> Handle(
        GetActivityLogSummaryQuery request,
        CancellationToken cancellationToken)
    {
        var query = _context.ActivityLogs
            .AsNoTracking()
            .AsQueryable();

        if (request.UserId.HasValue)
            query = query.Where(x => x.UserId == request.UserId.Value);

        if (!string.IsNullOrWhiteSpace(request.ModuleName))
        {
            var moduleName = request.ModuleName.Trim();
            query = query.Where(x => x.ModuleName == moduleName);
        }

        if (request.FromDate.HasValue)
        {
            var fromUtc = RestaurantTime.GetUtcStart(request.FromDate.Value);
            query = query.Where(x => x.CreatedAt >= fromUtc);
        }

        if (request.ToDate.HasValue)
        {
            var toUtcExclusive = RestaurantTime.GetUtcEndExclusive(request.ToDate.Value);
            query = query.Where(x => x.CreatedAt < toUtcExclusive);
        }

        var todayRange = RestaurantTime.GetUtcRange(
            RestaurantTime.LocalToday,
            RestaurantTime.LocalToday);

        var totalLogs = await query.CountAsync(cancellationToken);
        var totalSuccessLogs = await query
            .CountAsync(x => x.Status == "Success", cancellationToken);
        var totalFailedLogs = await query
            .CountAsync(x => x.Status == "Failed", cancellationToken);

        var totalTodayLogs = await query
            .CountAsync(x =>
                x.CreatedAt >= todayRange.StartUtc &&
                x.CreatedAt < todayRange.EndUtc,
                cancellationToken);

        var totalTodaySuccessLogs = await query
            .CountAsync(x =>
                x.CreatedAt >= todayRange.StartUtc &&
                x.CreatedAt < todayRange.EndUtc &&
                x.Status == "Success",
                cancellationToken);

        var totalTodayFailedLogs = await query
            .CountAsync(x =>
                x.CreatedAt >= todayRange.StartUtc &&
                x.CreatedAt < todayRange.EndUtc &&
                x.Status == "Failed",
                cancellationToken);

        return new ActivityLogSummaryDto
        {
            TotalLogs = totalLogs,
            TotalSuccessLogs = totalSuccessLogs,
            TotalFailedLogs = totalFailedLogs,
            TotalTodayLogs = totalTodayLogs,
            TotalTodaySuccessLogs = totalTodaySuccessLogs,
            TotalTodayFailedLogs = totalTodayFailedLogs
        };
    }
}
