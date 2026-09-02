using Microsoft.EntityFrameworkCore;

namespace QuanLyNhaHang.Infrastructure.AI;

internal sealed partial class AiAssistantDataProvider
{
    private async Task<object> GetTablesModuleAsync(CancellationToken cancellationToken)
    {
        var areas = await _dbContext.Areas
            .AsNoTracking()
            .OrderBy(item => item.Name)
            .Select(item => new { item.Id, item.Name, item.Description, item.IsActive })
            .ToListAsync(cancellationToken);
        var areaNames = areas.ToDictionary(item => item.Id, item => item.Name);
        var tables = await _dbContext.RestaurantTables
            .AsNoTracking()
            .OrderBy(item => item.Name)
            .Select(item => new { item.AreaId, item.Name, item.Capacity, item.Status, item.Note, item.IsActive })
            .ToListAsync(cancellationToken);

        return new
        {
            areas = areas.Select(item => new { item.Name, item.Description, item.IsActive }),
            tables = tables.Select(item => new
            {
                area = areaNames.TryGetValue(item.AreaId, out var areaName) ? areaName : "Khác",
                item.Name,
                item.Capacity,
                item.Status,
                item.Note,
                item.IsActive
            })
        };
    }

    private async Task<object> GetMenuModuleAsync(
        string query,
        int limit,
        CancellationToken cancellationToken)
    {
        var categories = await _dbContext.MenuCategories
            .AsNoTracking()
            .OrderBy(item => item.Name)
            .Select(item => new { item.Id, item.Name, item.IsActive })
            .ToListAsync(cancellationToken);
        var categoryNames = categories.ToDictionary(item => item.Id, item => item.Name);
        var items = await _dbContext.MenuItems
            .AsNoTracking()
            .OrderBy(item => item.Name)
            .Take(250)
            .ToListAsync(cancellationToken);

        var filtered = items
            .Where(item => string.IsNullOrWhiteSpace(query)
                || item.Name.Contains(query, StringComparison.OrdinalIgnoreCase)
                || (!string.IsNullOrWhiteSpace(item.Description)
                    && item.Description.Contains(query, StringComparison.OrdinalIgnoreCase)))
            .Take(limit)
            .Select(item => new
            {
                item.Name,
                category = categoryNames.TryGetValue(item.MenuCategoryId, out var category)
                    ? category
                    : "Khác",
                item.Description,
                item.Price,
                item.IsAvailable,
                item.IsActive
            })
            .ToList();

        return new
        {
            categories = categories.Select(item => new { item.Name, item.IsActive }),
            items = filtered
        };
    }

    private async Task<object> GetOrdersModuleAsync(
        string status,
        string query,
        DateTime? from,
        DateTime? to,
        int limit,
        CancellationToken cancellationToken)
    {
        var ordersQuery = _dbContext.Orders.AsNoTracking().AsQueryable();
        if (!string.IsNullOrWhiteSpace(status))
            ordersQuery = ordersQuery.Where(item => item.Status == status);
        if (from.HasValue)
            ordersQuery = ordersQuery.Where(item => item.CreatedAt >= from.Value);
        if (to.HasValue)
            ordersQuery = ordersQuery.Where(item => item.CreatedAt < to.Value);
        if (!string.IsNullOrWhiteSpace(query))
            ordersQuery = ordersQuery.Where(item => item.OrderCode.Contains(query));

        var orders = await ordersQuery
            .OrderByDescending(item => item.CreatedAt)
            .Take(limit)
            .Select(item => new
            {
                item.Id,
                item.OrderCode,
                item.OrderType,
                item.Status,
                item.TotalAmount,
                item.RestaurantTableId,
                item.PickupTime,
                item.IsActive,
                item.CreatedAt,
                item.UpdatedAt
            })
            .ToListAsync(cancellationToken);
        var ids = orders.Select(item => item.Id).ToArray();
        var items = ids.Length == 0
            ? []
            : await _dbContext.OrderItems
                .AsNoTracking()
                .Where(item => ids.Contains(item.OrderId))
                .Select(item => new
                {
                    item.OrderId,
                    item.MenuItemName,
                    item.Quantity,
                    item.TotalPrice,
                    item.Status
                })
                .ToListAsync(cancellationToken);

        return new
        {
            count = orders.Count,
            orders = orders.Select(order => new
            {
                order.OrderCode,
                order.OrderType,
                order.Status,
                order.TotalAmount,
                order.RestaurantTableId,
                order.PickupTime,
                order.IsActive,
                order.CreatedAt,
                order.UpdatedAt,
                items = items.Where(item => item.OrderId == order.Id).Select(item => new
                {
                    item.MenuItemName,
                    item.Quantity,
                    item.TotalPrice,
                    item.Status
                })
            }),
            privacy = "Tên/số điện thoại khách không được chuyển sang Gemini trong công cụ quản trị này."
        };
    }

    private async Task<object> GetKitchenModuleAsync(
        string status,
        int limit,
        CancellationToken cancellationToken)
    {
        var query = _dbContext.OrderItems.AsNoTracking().AsQueryable();
        if (!string.IsNullOrWhiteSpace(status))
            query = query.Where(item => item.Status == status);
        else
            query = query.Where(item => item.Status == "Pending" || item.Status == "Cooking" || item.Status == "Ready");

        var items = await query
            .OrderBy(item => item.Status)
            .ThenBy(item => item.CreatedAt)
            .Take(limit)
            .Select(item => new
            {
                item.OrderId,
                item.MenuItemName,
                item.Quantity,
                item.Status,
                item.Note,
                item.CreatedAt,
                item.StartedAt,
                item.CompletedAt
            })
            .ToListAsync(cancellationToken);

        return new { count = items.Count, items };
    }
}
