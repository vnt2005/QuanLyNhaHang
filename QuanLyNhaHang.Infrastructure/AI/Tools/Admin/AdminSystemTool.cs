using Microsoft.EntityFrameworkCore;

namespace QuanLyNhaHang.Infrastructure.AI;

internal sealed partial class AiAssistantDataProvider
{
    private async Task<object> GetActivityLogsModuleAsync(
        string query,
        DateTime? from,
        DateTime? to,
        int limit,
        CancellationToken cancellationToken)
    {
        var logsQuery = _dbContext.ActivityLogs.AsNoTracking().AsQueryable();
        if (from.HasValue)
            logsQuery = logsQuery.Where(item => item.CreatedAt >= from.Value);
        if (to.HasValue)
            logsQuery = logsQuery.Where(item => item.CreatedAt < to.Value);
        if (!string.IsNullOrWhiteSpace(query))
        {
            logsQuery = logsQuery.Where(item =>
                item.Action.Contains(query)
                || item.ModuleName.Contains(query)
                || item.Description.Contains(query));
        }

        var logs = await logsQuery
            .OrderByDescending(item => item.CreatedAt)
            .Take(limit)
            .Select(item => new
            {
                item.UserName,
                item.Action,
                item.ModuleName,
                item.EntityName,
                item.EntityId,
                item.Description,
                item.Status,
                item.CreatedAt
            })
            .ToListAsync(cancellationToken);

        return new
        {
            count = logs.Count,
            logs,
            excludedFields = new[] { "OldValues", "NewValues", "IpAddress", "UserAgent" }
        };
    }

    private async Task<object> GetNotificationsModuleAsync(
        string status,
        int limit,
        CancellationToken cancellationToken)
    {
        var query = _dbContext.Notifications.AsNoTracking().AsQueryable();
        if (string.Equals(status, "unread", StringComparison.OrdinalIgnoreCase))
            query = query.Where(item => !item.IsRead);
        if (string.Equals(status, "read", StringComparison.OrdinalIgnoreCase))
            query = query.Where(item => item.IsRead);

        var notifications = await query
            .OrderByDescending(item => item.CreatedAt)
            .Take(limit)
            .Select(item => new
            {
                item.UserId,
                item.Type,
                item.Title,
                item.Message,
                item.Severity,
                item.Target,
                item.EntityId,
                item.IsRead,
                item.CreatedAt
            })
            .ToListAsync(cancellationToken);

        return new { count = notifications.Count, notifications };
    }

    private async Task<object> GetTableQrModuleAsync(
        int limit,
        CancellationToken cancellationToken)
    {
        var tables = await _dbContext.RestaurantTables
            .AsNoTracking()
            .ToDictionaryAsync(item => item.Id, item => item.Name, cancellationToken);
        var qrs = await _dbContext.TableQrCodes
            .AsNoTracking()
            .OrderByDescending(item => item.UpdatedAt ?? item.CreatedAt)
            .Take(limit)
            .Select(item => new
            {
                item.RestaurantTableId,
                item.Status,
                item.Note,
                item.IsActive,
                item.CreatedAt,
                item.UpdatedAt
            })
            .ToListAsync(cancellationToken);

        return new
        {
            count = qrs.Count,
            qrCodes = qrs.Select(item => new
            {
                table = tables.TryGetValue(item.RestaurantTableId, out var table)
                    ? table
                    : item.RestaurantTableId.ToString(),
                item.Status,
                item.Note,
                item.IsActive,
                item.CreatedAt,
                item.UpdatedAt
            }),
            excludedFields = new[] { "Token", "QrCodeUrl" }
        };
    }

    private async Task<object> GetTableOperationsModuleAsync(
        int limit,
        CancellationToken cancellationToken)
    {
        var operations = await _dbContext.TableOperations
            .AsNoTracking()
            .OrderByDescending(item => item.CreatedAt)
            .Take(limit)
            .Select(item => new
            {
                item.OperationCode,
                item.OperationType,
                item.SourceTableId,
                item.TargetTableId,
                item.SourceOrderId,
                item.TargetOrderId,
                item.Status,
                item.Note,
                item.CreatedAt,
                item.CompletedAt
            })
            .ToListAsync(cancellationToken);

        return new { count = operations.Count, operations };
    }

    private async Task<object> GetPermissionsModuleAsync(
        CancellationToken cancellationToken)
    {
        return new
        {
            roles = await _dbContext.Roles.CountAsync(cancellationToken),
            permissions = await _dbContext.Permissions.CountAsync(cancellationToken),
            rolePermissionLinks = await _dbContext.RolePermissions.CountAsync(cancellationToken),
            note = "AI quản trị chỉ đọc thống kê phân quyền; không nhận password hash, mã xác minh hoặc secret."
        };
    }

    private async Task<object> GetRestaurantSettingsModuleAsync(
        CancellationToken cancellationToken)
    {
        var setting = await _dbContext.RestaurantSettings
            .AsNoTracking()
            .Where(item => item.IsActive)
            .OrderByDescending(item => item.UpdatedAt ?? item.CreatedAt)
            .Select(item => new
            {
                item.RestaurantName,
                item.Address,
                item.PhoneNumber,
                item.Email,
                item.TaxCode,
                item.WebsiteUrl,
                item.DefaultVatPercent,
                item.ServiceChargePercent,
                item.Currency,
                item.OpeningTime,
                item.ClosingTime,
                item.InvoiceFooter,
                item.QrOrderWelcomeMessage,
                item.AiAssistantEnabled,
                item.AiAssistantModel,
                item.AiAssistantMaxOutputTokens,
                item.IsActive,
                item.UpdatedAt
            })
            .FirstOrDefaultAsync(cancellationToken);

        return new
        {
            setting,
            excludedFields = new[] { "Gemini API key", "AI system prompt internals" }
        };
    }
}
