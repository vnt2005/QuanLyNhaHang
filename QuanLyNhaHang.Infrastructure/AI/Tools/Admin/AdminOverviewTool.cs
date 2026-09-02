using Microsoft.EntityFrameworkCore;

namespace QuanLyNhaHang.Infrastructure.AI;

internal sealed partial class AiAssistantDataProvider
{
    private async Task<object> GetAdminOverviewAsync(CancellationToken cancellationToken)
    {
        var today = DateTime.UtcNow.Date;
        var tomorrow = today.AddDays(1);

        var revenueToday = await _dbContext.Payments
            .AsNoTracking()
            .Where(item => item.Status == "Paid" && item.PaidAt >= today && item.PaidAt < tomorrow)
            .SumAsync(item => (decimal?)item.FinalAmount, cancellationToken) ?? 0m;

        return new
        {
            generatedAtUtc = DateTime.UtcNow,
            accounts = new
            {
                total = await _dbContext.Users.CountAsync(cancellationToken),
                active = await _dbContext.Users.CountAsync(item => item.IsActive, cancellationToken)
            },
            employees = new
            {
                total = await _dbContext.Employees.CountAsync(cancellationToken),
                active = await _dbContext.Employees.CountAsync(item => item.IsActive, cancellationToken),
                shifts = await _dbContext.Shifts.CountAsync(item => item.IsActive, cancellationToken)
            },
            restaurant = new
            {
                areas = await _dbContext.Areas.CountAsync(item => item.IsActive, cancellationToken),
                tables = await _dbContext.RestaurantTables.CountAsync(item => item.IsActive, cancellationToken),
                availableTables = await _dbContext.RestaurantTables.CountAsync(item => item.IsActive && item.Status == "Available", cancellationToken)
            },
            menu = new
            {
                categories = await _dbContext.MenuCategories.CountAsync(item => item.IsActive, cancellationToken),
                items = await _dbContext.MenuItems.CountAsync(item => item.IsActive, cancellationToken),
                availableItems = await _dbContext.MenuItems.CountAsync(item => item.IsActive && item.IsAvailable, cancellationToken)
            },
            orders = new
            {
                today = await _dbContext.Orders.CountAsync(item => item.CreatedAt >= today && item.CreatedAt < tomorrow, cancellationToken),
                pending = await _dbContext.Orders.CountAsync(item => item.IsActive && item.Status == "Pending", cancellationToken),
                cooking = await _dbContext.Orders.CountAsync(item => item.IsActive && item.Status == "Cooking", cancellationToken),
                ready = await _dbContext.Orders.CountAsync(item => item.IsActive && item.Status == "Ready", cancellationToken)
            },
            kitchen = new
            {
                pendingItems = await _dbContext.OrderItems.CountAsync(item => item.Status == "Pending", cancellationToken),
                cookingItems = await _dbContext.OrderItems.CountAsync(item => item.Status == "Cooking", cancellationToken),
                readyItems = await _dbContext.OrderItems.CountAsync(item => item.Status == "Ready", cancellationToken)
            },
            payments = new
            {
                revenueToday,
                paidToday = await _dbContext.Payments.CountAsync(item => item.Status == "Paid" && item.PaidAt >= today && item.PaidAt < tomorrow, cancellationToken),
                attemptsPending = await _dbContext.PaymentAttempts.CountAsync(item => item.Status == "Pending", cancellationToken),
                attemptsReview = await _dbContext.PaymentAttempts.CountAsync(item => item.Status == "RequiresReview", cancellationToken)
            },
            reservations = new
            {
                today = await _dbContext.Reservations.CountAsync(item => item.ReservationTime >= today && item.ReservationTime < tomorrow, cancellationToken),
                pending = await _dbContext.Reservations.CountAsync(item => item.Status == "Pending", cancellationToken),
                confirmed = await _dbContext.Reservations.CountAsync(item => item.Status == "Confirmed", cancellationToken)
            },
            inventory = new
            {
                ingredients = await _dbContext.Ingredients.CountAsync(item => item.IsActive, cancellationToken),
                lowStock = await _dbContext.Ingredients.CountAsync(item => item.IsActive && item.CurrentStock <= item.MinimumStock, cancellationToken),
                transactionsToday = await _dbContext.InventoryTransactions.CountAsync(item => item.TransactionDate >= today && item.TransactionDate < tomorrow, cancellationToken)
            },
            promotions = new
            {
                active = await _dbContext.Promotions.CountAsync(item => item.IsActive && item.StartDate <= DateTime.UtcNow && item.EndDate >= DateTime.UtcNow, cancellationToken)
            },
            system = new
            {
                unreadNotifications = await _dbContext.Notifications.CountAsync(item => !item.IsRead, cancellationToken),
                activityLogsToday = await _dbContext.ActivityLogs.CountAsync(item => item.CreatedAt >= today && item.CreatedAt < tomorrow, cancellationToken),
                activeTableQr = await _dbContext.TableQrCodes.CountAsync(item => item.IsActive, cancellationToken)
            }
        };
    }
}
