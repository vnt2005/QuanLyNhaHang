using MediatR;
using Microsoft.EntityFrameworkCore;
using QuanLyNhaHang.Application.Common.Extensions;
using QuanLyNhaHang.Application.Common.Interfaces;
using QuanLyNhaHang.Application.Common.Time;
using QuanLyNhaHang.Application.Features.Dashboard.DTOs;

namespace QuanLyNhaHang.Application.Features.Dashboard.Queries.GetDashboard;

public class GetDashboardQueryHandler : IRequestHandler<GetDashboardQuery, DashboardDto>
{
    private readonly IApplicationDbContext _context;

    public GetDashboardQueryHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<DashboardDto> Handle(
        GetDashboardQuery request,
        CancellationToken cancellationToken)
    {
        var today = RestaurantTime.LocalToday;
        var fromDate = (request.FromDate ?? today.AddDays(-6)).Date;
        var toDate = (request.ToDate ?? today).Date;

        if (fromDate > toDate)
            (fromDate, toDate) = (toDate, fromDate);

        var todayRange = RestaurantTime.GetUtcRange(today, today);
        var selectedRange = RestaurantTime.GetUtcRange(fromDate, toDate);
        var top = request.Top <= 0 ? 5 : request.Top;

        var overview = await GetOverviewAsync(
            todayRange.StartUtc,
            todayRange.EndUtc,
            cancellationToken);

        var revenueChart = await GetRevenueChartAsync(
            fromDate,
            toDate,
            selectedRange.StartUtc,
            selectedRange.EndUtc,
            cancellationToken);

        var topSellingItems = await GetTopSellingItemsAsync(
            selectedRange.StartUtc,
            selectedRange.EndUtc,
            top,
            cancellationToken);

        var lowStockIngredients = await GetLowStockIngredientsAsync(
            top,
            cancellationToken);

        return new DashboardDto
        {
            Overview = overview,
            RevenueChart = revenueChart,
            TopSellingItems = topSellingItems,
            LowStockIngredients = lowStockIngredients
        };
    }

    private async Task<DashboardOverviewDto> GetOverviewAsync(
        DateTime todayStartUtc,
        DateTime tomorrowStartUtc,
        CancellationToken cancellationToken)
    {
        var todayOrdersQuery = _context.Orders
            .AsNoTracking()
            .Where(x => x.CreatedAt >= todayStartUtc && x.CreatedAt < tomorrowStartUtc);

        var todayInvoicesQuery = _context.Invoices
            .AsNoTracking()
            .Where(x =>
                x.CreatedAt >= todayStartUtc &&
                x.CreatedAt < tomorrowStartUtc &&
                x.Status != "Cancelled");

        var todayPaymentsQuery = _context.Payments
            .AsNoTracking()
            .Where(x => x.PaidAt >= todayStartUtc && x.PaidAt < tomorrowStartUtc);

        var todayReservationsQuery = _context.Reservations
            .AsNoTracking()
            .Where(x => x.CreatedAt >= todayStartUtc && x.CreatedAt < tomorrowStartUtc);

        var todayActivityLogsQuery = _context.ActivityLogs
            .AsNoTracking()
            .Where(x => x.CreatedAt >= todayStartUtc && x.CreatedAt < tomorrowStartUtc);

        var todayRevenue = await todayPaymentsQuery
            .Where(x => x.Status == "Paid")
            .SumAsync(x => x.FinalAmount, cancellationToken);

        var todayOrders = await todayOrdersQuery.CountAsync(cancellationToken);
        var todayInvoices = await todayInvoicesQuery.CountAsync(cancellationToken);
        var todayPayments = await todayPaymentsQuery.CountAsync(cancellationToken);

        var todayDiscountAmount = await todayPaymentsQuery
            .Where(x => x.Status == "Paid")
            .SumAsync(x => x.DiscountAmount, cancellationToken);

        var todayVatAmount = await todayPaymentsQuery
            .Where(x => x.Status == "Paid")
            .SumAsync(x => x.VatAmount, cancellationToken);

        var pendingOrders = await _context.Orders.AsNoTracking()
            .CountAsync(x => x.Status == "Pending", cancellationToken);
        var cookingOrders = await _context.Orders.AsNoTracking()
            .CountAsync(x => x.Status == "Cooking", cancellationToken);
        var servedOrders = await _context.Orders.AsNoTracking()
            .CountAsync(x => x.Status == "Served", cancellationToken);
        var completedOrders = await _context.Orders.AsNoTracking()
            .CountAsync(x => x.Status == "Completed", cancellationToken);
        var cancelledOrders = await _context.Orders.AsNoTracking()
            .CountAsync(x => x.Status == "Cancelled", cancellationToken);

        var operationalTables = _context.RestaurantTables
            .AsNoTracking()
            .WhereOperational(_context);

        var availableTables = await operationalTables
            .CountAsync(x => x.Status == "Available", cancellationToken);
        var occupiedTables = await operationalTables
            .CountAsync(x => x.Status == "Occupied", cancellationToken);
        var reservedTables = await operationalTables
            .CountAsync(x => x.Status == "Reserved", cancellationToken);
        var cleaningTables = await operationalTables
            .CountAsync(x => x.Status == "Cleaning", cancellationToken);

        var pendingKitchenItems = await _context.OrderItems.AsNoTracking()
            .CountAsync(x => x.Status == "Pending", cancellationToken);
        var cookingKitchenItems = await _context.OrderItems.AsNoTracking()
            .CountAsync(x => x.Status == "Cooking", cancellationToken);
        var readyKitchenItems = await _context.OrderItems.AsNoTracking()
            .CountAsync(x => x.Status == "Ready", cancellationToken);
        var servedKitchenItems = await _context.OrderItems.AsNoTracking()
            .CountAsync(x => x.Status == "Served", cancellationToken);

        var todayReservations = await todayReservationsQuery.CountAsync(cancellationToken);
        var pendingReservations = await _context.Reservations.AsNoTracking()
            .CountAsync(x => x.Status == "Pending", cancellationToken);
        var confirmedReservations = await _context.Reservations.AsNoTracking()
            .CountAsync(x => x.Status == "Confirmed", cancellationToken);

        var lowStockIngredients = await _context.Ingredients.AsNoTracking()
            .CountAsync(
                x => x.IsActive && x.CurrentStock <= x.MinimumStock,
                cancellationToken);

        var todayActivityLogs = await todayActivityLogsQuery.CountAsync(cancellationToken);
        var todayFailedActivityLogs = await todayActivityLogsQuery
            .CountAsync(x => x.Status == "Failed", cancellationToken);

        return new DashboardOverviewDto
        {
            TodayRevenue = todayRevenue,
            TodayOrders = todayOrders,
            TodayInvoices = todayInvoices,
            TodayPayments = todayPayments,
            TodayDiscountAmount = todayDiscountAmount,
            TodayVatAmount = todayVatAmount,
            PendingOrders = pendingOrders,
            CookingOrders = cookingOrders,
            ServedOrders = servedOrders,
            CompletedOrders = completedOrders,
            CancelledOrders = cancelledOrders,
            AvailableTables = availableTables,
            OccupiedTables = occupiedTables,
            ReservedTables = reservedTables,
            CleaningTables = cleaningTables,
            PendingKitchenItems = pendingKitchenItems,
            CookingKitchenItems = cookingKitchenItems,
            ReadyKitchenItems = readyKitchenItems,
            ServedKitchenItems = servedKitchenItems,
            TodayReservations = todayReservations,
            PendingReservations = pendingReservations,
            ConfirmedReservations = confirmedReservations,
            LowStockIngredients = lowStockIngredients,
            TodayActivityLogs = todayActivityLogs,
            TodayFailedActivityLogs = todayFailedActivityLogs
        };
    }

    private async Task<List<DashboardRevenueChartDto>> GetRevenueChartAsync(
        DateTime fromLocalDate,
        DateTime toLocalDate,
        DateTime fromUtc,
        DateTime toUtcExclusive,
        CancellationToken cancellationToken)
    {
        var payments = await _context.Payments
            .AsNoTracking()
            .Where(x =>
                x.PaidAt >= fromUtc &&
                x.PaidAt < toUtcExclusive &&
                x.Status == "Paid")
            .Select(x => new { x.PaidAt, x.FinalAmount })
            .ToListAsync(cancellationToken);

        var orders = await _context.Orders
            .AsNoTracking()
            .Where(x => x.CreatedAt >= fromUtc && x.CreatedAt < toUtcExclusive)
            .Select(x => x.CreatedAt)
            .ToListAsync(cancellationToken);

        var invoices = await _context.Invoices
            .AsNoTracking()
            .Where(x =>
                x.CreatedAt >= fromUtc &&
                x.CreatedAt < toUtcExclusive &&
                x.Status != "Cancelled")
            .Select(x => x.CreatedAt)
            .ToListAsync(cancellationToken);

        var revenueDictionary = payments
            .GroupBy(x => RestaurantTime.ToLocal(x.PaidAt).Date)
            .ToDictionary(x => x.Key, x => x.Sum(item => item.FinalAmount));

        var orderDictionary = orders
            .GroupBy(x => RestaurantTime.ToLocal(x).Date)
            .ToDictionary(x => x.Key, x => x.Count());

        var invoiceDictionary = invoices
            .GroupBy(x => RestaurantTime.ToLocal(x).Date)
            .ToDictionary(x => x.Key, x => x.Count());

        var totalDays = (toLocalDate - fromLocalDate).Days + 1;

        return Enumerable.Range(0, totalDays)
            .Select(index =>
            {
                var date = fromLocalDate.AddDays(index).Date;
                revenueDictionary.TryGetValue(date, out var revenue);
                orderDictionary.TryGetValue(date, out var orderCount);
                invoiceDictionary.TryGetValue(date, out var invoiceCount);

                return new DashboardRevenueChartDto
                {
                    Date = date,
                    DateText = date.ToString("dd/MM"),
                    Revenue = revenue,
                    OrderCount = orderCount,
                    InvoiceCount = invoiceCount
                };
            })
            .ToList();
    }

    private async Task<List<DashboardTopSellingItemDto>> GetTopSellingItemsAsync(
        DateTime fromUtc,
        DateTime toUtcExclusive,
        int top,
        CancellationToken cancellationToken)
    {
        var paidOrderIdsQuery = _context.Payments
            .AsNoTracking()
            .Where(payment =>
                payment.Status == "Paid" &&
                payment.PaidAt >= fromUtc &&
                payment.PaidAt < toUtcExclusive)
            .Select(payment => payment.OrderId)
            .Distinct();

        return await _context.OrderItems
            .AsNoTracking()
            .Where(x =>
                paidOrderIdsQuery.Contains(x.OrderId) &&
                x.Status != "Cancelled")
            .GroupBy(x => new { x.MenuItemId, x.MenuItemName })
            .Select(g => new DashboardTopSellingItemDto
            {
                MenuItemId = g.Key.MenuItemId,
                MenuItemName = g.Key.MenuItemName,
                QuantitySold = g.Sum(x => x.Quantity),
                TotalRevenue = g.Sum(x => x.TotalPrice)
            })
            .OrderByDescending(x => x.QuantitySold)
            .Take(top)
            .ToListAsync(cancellationToken);
    }

    private async Task<List<DashboardLowStockIngredientDto>> GetLowStockIngredientsAsync(
        int top,
        CancellationToken cancellationToken)
    {
        return await _context.Ingredients
            .AsNoTracking()
            .Where(x => x.IsActive && x.CurrentStock <= x.MinimumStock)
            .OrderBy(x => x.CurrentStock)
            .Take(top)
            .Select(x => new DashboardLowStockIngredientDto
            {
                IngredientId = x.Id,
                IngredientCode = x.IngredientCode,
                IngredientName = x.Name,
                Unit = x.Unit,
                CurrentStock = x.CurrentStock,
                MinimumStock = x.MinimumStock,
                MissingQuantity = x.MinimumStock - x.CurrentStock
            })
            .ToListAsync(cancellationToken);
    }
}
