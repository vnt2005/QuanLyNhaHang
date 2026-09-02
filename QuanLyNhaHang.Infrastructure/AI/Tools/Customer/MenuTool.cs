using System.Text.Json;
using Microsoft.EntityFrameworkCore;

namespace QuanLyNhaHang.Infrastructure.AI;

internal sealed partial class AiAssistantDataProvider
{
    private async Task<object> SearchMenuAsync(
        JsonElement args,
        CancellationToken cancellationToken)
    {
        var query = AiToolArguments.GetString(args, "query");
        var category = AiToolArguments.GetString(args, "category");
        var onlyAvailable = AiToolArguments.GetBoolean(args, "onlyAvailable", true);
        var limit = AiToolArguments.GetLimit(args, 30, MaximumLimit);

        var categories = await _dbContext.MenuCategories
            .AsNoTracking()
            .Where(item => item.IsActive)
            .Select(item => new { item.Id, item.Name })
            .ToListAsync(cancellationToken);
        var categoryNames = categories.ToDictionary(item => item.Id, item => item.Name);
        var categoryIds = string.IsNullOrWhiteSpace(category)
            ? null
            : categories
                .Where(item => item.Name.Contains(category, StringComparison.OrdinalIgnoreCase))
                .Select(item => item.Id)
                .ToHashSet();

        var items = await _dbContext.MenuItems
            .AsNoTracking()
            .Where(item => item.IsActive && (!onlyAvailable || item.IsAvailable))
            .OrderBy(item => item.Name)
            .Take(200)
            .ToListAsync(cancellationToken);

        var normalizedQuery = query.Trim();
        var filtered = items
            .Where(item => categoryIds is null || categoryIds.Contains(item.MenuCategoryId))
            .Where(item => normalizedQuery.Length == 0
                || item.Name.Contains(normalizedQuery, StringComparison.OrdinalIgnoreCase)
                || (!string.IsNullOrWhiteSpace(item.Description)
                    && item.Description.Contains(normalizedQuery, StringComparison.OrdinalIgnoreCase)))
            .Take(limit)
            .Select(item => new
            {
                item.Name,
                category = categoryNames.TryGetValue(item.MenuCategoryId, out var name) ? name : "Khác",
                item.Description,
                item.Price,
                item.IsAvailable
            })
            .ToList();

        return new
        {
            query,
            category,
            onlyAvailable,
            count = filtered.Count,
            items = filtered
        };
    }

    private async Task<object> GetActivePromotionsAsync(
        CancellationToken cancellationToken)
    {
        var now = DateTime.UtcNow;
        var promotions = await _dbContext.Promotions
            .AsNoTracking()
            .Where(item => item.IsActive
                && item.StartDate <= now
                && item.EndDate >= now
                && (!item.UsageLimit.HasValue || item.UsedCount < item.UsageLimit.Value))
            .OrderBy(item => item.EndDate)
            .Take(30)
            .Select(item => new
            {
                item.PromotionCode,
                item.Name,
                item.Description,
                item.DiscountType,
                item.DiscountValue,
                item.MinimumOrderAmount,
                item.MaximumDiscountAmount,
                item.StartDate,
                item.EndDate,
                item.UsageLimit,
                item.UsedCount
            })
            .ToListAsync(cancellationToken);

        return new { count = promotions.Count, promotions };
    }
}
