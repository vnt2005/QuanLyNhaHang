using MediatR;
using Microsoft.EntityFrameworkCore;
using QuanLyNhaHang.Application.Common.Interfaces;
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
        {
            query = query.Where(x => x.UserId == request.UserId.Value);
        }

        if (!string.IsNullOrWhiteSpace(request.ModuleName))
        {
            var moduleName = request.ModuleName.Trim();

            query = query.Where(x => x.ModuleName == moduleName);
        }

        if (request.FromDate.HasValue)
        {
            query = query.Where(x => x.CreatedAt >= request.FromDate.Value);
        }

        if (request.ToDate.HasValue)
        {
            query = query.Where(x => x.CreatedAt <= request.ToDate.Value);
        }

        var todayStart = DateTime.UtcNow.Date;
        var tomorrowStart = todayStart.AddDays(1);

        var totalLogs = await query.CountAsync(cancellationToken);

        var totalSuccessLogs = await query
            .CountAsync(x => x.Status == "Success", cancellationToken);

        var totalFailedLogs = await query
            .CountAsync(x => x.Status == "Failed", cancellationToken);

        var totalTodayLogs = await query
            .CountAsync(x =>
                x.CreatedAt >= todayStart &&
                x.CreatedAt < tomorrowStart,
                cancellationToken);

        var totalTodaySuccessLogs = await query
            .CountAsync(x =>
                x.CreatedAt >= todayStart &&
                x.CreatedAt < tomorrowStart &&
                x.Status == "Success",
                cancellationToken);

        var totalTodayFailedLogs = await query
            .CountAsync(x =>
                x.CreatedAt >= todayStart &&
                x.CreatedAt < tomorrowStart &&
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