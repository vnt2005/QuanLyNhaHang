using Microsoft.EntityFrameworkCore;

namespace QuanLyNhaHang.Infrastructure.AI;

internal sealed partial class AiAssistantDataProvider
{
    private async Task<object> GetReservationsModuleAsync(
        string status,
        DateTime? from,
        DateTime? to,
        int limit,
        CancellationToken cancellationToken)
    {
        var query = _dbContext.Reservations.AsNoTracking().AsQueryable();
        if (!string.IsNullOrWhiteSpace(status))
            query = query.Where(item => item.Status == status);
        if (from.HasValue)
            query = query.Where(item => item.ReservationTime >= from.Value);
        if (to.HasValue)
            query = query.Where(item => item.ReservationTime < to.Value);

        var reservations = await query
            .OrderByDescending(item => item.ReservationTime)
            .Take(limit)
            .Select(item => new
            {
                item.ReservationCode,
                item.RestaurantTableId,
                item.NumberOfGuests,
                item.ReservationTime,
                item.DepositAmount,
                item.Status,
                item.CreatedAt,
                item.ConfirmedAt,
                item.CheckedInAt,
                item.CompletedAt,
                item.CancelledAt
            })
            .ToListAsync(cancellationToken);

        return new
        {
            count = reservations.Count,
            reservations,
            privacy = "Tên, email và số điện thoại khách đặt bàn không được chuyển sang Gemini."
        };
    }

    private async Task<object> GetPromotionsModuleAsync(
        int limit,
        CancellationToken cancellationToken)
    {
        var promotions = await _dbContext.Promotions
            .AsNoTracking()
            .OrderByDescending(item => item.CreatedAt)
            .Take(limit)
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
                item.UsedCount,
                item.IsActive
            })
            .ToListAsync(cancellationToken);

        return new { count = promotions.Count, promotions };
    }

    private async Task<object> GetInventoryModuleAsync(
        string query,
        int limit,
        CancellationToken cancellationToken)
    {
        var ingredients = await _dbContext.Ingredients
            .AsNoTracking()
            .OrderBy(item => item.Name)
            .Take(250)
            .ToListAsync(cancellationToken);
        var filtered = ingredients
            .Where(item => string.IsNullOrWhiteSpace(query)
                || item.Name.Contains(query, StringComparison.OrdinalIgnoreCase)
                || item.IngredientCode.Contains(query, StringComparison.OrdinalIgnoreCase))
            .Take(limit)
            .Select(item => new
            {
                item.IngredientCode,
                item.Name,
                item.Unit,
                item.CurrentStock,
                item.MinimumStock,
                item.CostPrice,
                lowStock = item.CurrentStock <= item.MinimumStock,
                item.IsActive
            })
            .ToList();

        var transactions = await _dbContext.InventoryTransactions
            .AsNoTracking()
            .OrderByDescending(item => item.TransactionDate)
            .Take(limit)
            .Select(item => new
            {
                item.TransactionCode,
                item.IngredientId,
                item.TransactionType,
                item.Quantity,
                item.UnitPrice,
                item.TotalAmount,
                item.StockBefore,
                item.StockAfter,
                item.Status,
                item.TransactionDate
            })
            .ToListAsync(cancellationToken);

        return new { ingredients = filtered, recentTransactions = transactions };
    }
}
