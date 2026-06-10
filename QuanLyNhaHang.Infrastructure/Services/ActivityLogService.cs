using QuanLyNhaHang.Application.Common.Interfaces;
using QuanLyNhaHang.Domain.Entities;

namespace QuanLyNhaHang.Infrastructure.Services;

public class ActivityLogService : IActivityLogService
{
    private readonly IApplicationDbContext _context;

    public ActivityLogService(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task LogAsync(
        Guid? userId,
        string? userName,
        string action,
        string moduleName,
        string? entityName,
        Guid? entityId,
        string description,
        string? oldValues,
        string? newValues,
        string? ipAddress,
        string? userAgent,
        string status,
        CancellationToken cancellationToken = default)
    {
        var activityLog = new ActivityLog(
            userId,
            userName,
            action,
            moduleName,
            entityName,
            entityId,
            description,
            oldValues,
            newValues,
            ipAddress,
            userAgent,
            status);

        await _context.ActivityLogs.AddAsync(activityLog, cancellationToken);

        await _context.SaveChangesAsync(cancellationToken);
    }
}