namespace QuanLyNhaHang.Application.Common.Interfaces;

public interface IActivityLogService
{
    Task LogAsync(
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
        CancellationToken cancellationToken = default);
}