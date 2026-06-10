using MediatR;
using Microsoft.EntityFrameworkCore;
using QuanLyNhaHang.Application.Common.Interfaces;
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
        var today = DateTime.UtcNow.Date;
        var tomorrow = today.AddDays(1);

        var fromDate = (request.FromDate ?? today.AddDays(-6)).Date;
        var toDate = (request.ToDate ?? today).Date;

        if (fromDate > toDate)
        {
            (fromDate, toDate) = (toDate, fromDate);
        }

        var toDateExclusive = toDate.AddDays(1);
        var top = request.Top <= 0 ? 5 : request.Top;

        var overview = await GetOverviewAsync(
            today,
            tomorrow,
            cancellationToken);

        var revenueChart = await GetRevenueChartAsync(
            fromDate,
            toDate,
            toDateExclusive,
            cancellationToken);

        var topSellingItems = await GetTopSellingItemsAsync(
            fromDate,
            toDateExclusive,
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
        DateTime today,
        DateTime tomorrow,
        CancellationToken cancellationToken)
    {
        var todayOrdersQuery = _context.Orders
            .AsNoTracking()
            .Where(x => x.CreatedAt >= today && x.CreatedAt < tomorrow);

        var todayInvoicesQuery = _context.Invoices
            .AsNoTracking()
            .Where(x => x.CreatedAt >= today && x.CreatedAt < tomorrow);

        var todayPaymentsQuery = _context.Payments
            .AsNoTracking()
            .Where(x => x.CreatedAt >= today && x.CreatedAt < tomorrow);

        var todayReservationsQuery = _context.Reservations
            .AsNoTracking()
            .Where(x => x.CreatedAt >= today && x.CreatedAt < tomorrow);

        var todayActivityLogsQuery = _context.ActivityLogs
            .AsNoTracking()
            .Where(x => x.CreatedAt >= today && x.CreatedAt < tomorrow);

        var todayRevenue = await todayPaymentsQuery
            .Where(x => x.Status == "Paid")
            .SumAsync(x => x.FinalAmount, cancellationToken);

        var todayOrders = await todayOrdersQuery
            .CountAsync(cancellationToken);

        var todayInvoices = await todayInvoicesQuery
            .CountAsync(cancellationToken);

        var todayPayments = await todayPaymentsQuery
            .CountAsync(cancellationToken);

        var todayDiscountAmount = await todayPaymentsQuery
            .Where(x => x.Status == "Paid")
            .SumAsync(x => x.DiscountAmount, cancellationToken);

        var todayVatAmount = await todayPaymentsQuery
            .Where(x => x.Status == "Paid")
            .SumAsync(x => x.VatAmount, cancellationToken);

        var pendingOrders = await _context.Orders
            .AsNoTracking()
            .CountAsync(x => x.Status == "Pending", cancellationToken);

        var cookingOrders = await _context.Orders
            .AsNoTracking()
            .CountAsync(x => x.Status == "Cooking", cancellationToken);

        var servedOrders = await _context.Orders
            .AsNoTracking()
            .CountAsync(x => x.Status == "Served", cancellationToken);

        var completedOrders = await _context.Orders
            .AsNoTracking()
            .CountAsync(x => x.Status == "Completed", cancellationToken);

        var cancelledOrders = await _context.Orders
            .AsNoTracking()
            .CountAsync(x => x.Status == "Cancelled", cancellationToken);

        var availableTables = await _context.RestaurantTables
            .AsNoTracking()
            .CountAsync(x => x.Status == "Available", cancellationToken);

        var occupiedTables = await _context.RestaurantTables
            .AsNoTracking()
            .CountAsync(x => x.Status == "Occupied", cancellationToken);

        var reservedTables = await _context.RestaurantTables
            .AsNoTracking()
            .CountAsync(x => x.Status == "Reserved", cancellationToken);

        var cleaningTables = await _context.RestaurantTables
            .AsNoTracking()
            .CountAsync(x => x.Status == "Cleaning", cancellationToken);

        var pendingKitchenItems = await _context.OrderItems
            .AsNoTracking()
            .CountAsync(x => x.Status == "Pending", cancellationToken);

        var cookingKitchenItems = await _context.OrderItems
            .AsNoTracking()
            .CountAsync(x => x.Status == "Cooking", cancellationToken);

        var readyKitchenItems = await _context.OrderItems
            .AsNoTracking()
            .CountAsync(x => x.Status == "Ready", cancellationToken);

        var servedKitchenItems = await _context.OrderItems
            .AsNoTracking()
            .CountAsync(x => x.Status == "Served", cancellationToken);

        var todayReservations = await todayReservationsQuery
            .CountAsync(cancellationToken);

        var pendingReservations = await _context.Reservations
            .AsNoTracking()
            .CountAsync(x => x.Status == "Pending", cancellationToken);

        var confirmedReservations = await _context.Reservations
            .AsNoTracking()
            .CountAsync(x => x.Status == "Confirmed", cancellationToken);

        var lowStockIngredients = await _context.Ingredients
            .AsNoTracking()
            .CountAsync(x =>
                x.IsActive &&
                x.CurrentStock <= x.MinimumStock,
                cancellationToken);

        var todayActivityLogs = await todayActivityLogsQuery
            .CountAsync(cancellationToken);

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
        DateTime fromDate,
        DateTime toDate,
        DateTime toDateExclusive,
        CancellationToken cancellationToken)
    {
        var revenueData = await _context.Payments
            .AsNoTracking()
            .Where(x =>
                x.CreatedAt >= fromDate &&
                x.CreatedAt < toDateExclusive &&
                x.Status == "Paid")
            .GroupBy(x => x.CreatedAt.Date)
            .Select(g => new
            {
                Date = g.Key,
                Revenue = g.Sum(x => x.FinalAmount)
            })
            .ToListAsync(cancellationToken);

        var orderData = await _context.Orders
            .AsNoTracking()
            .Where(x => x.CreatedAt >= fromDate && x.CreatedAt < toDateExclusive)
            .GroupBy(x => x.CreatedAt.Date)
            .Select(g => new
            {
                Date = g.Key,
                OrderCount = g.Count()
            })
            .ToListAsync(cancellationToken);

        var invoiceData = await _context.Invoices
            .AsNoTracking()
            .Where(x =>
                x.CreatedAt >= fromDate &&
                x.CreatedAt < toDateExclusive &&
                x.Status != "Cancelled")
            .GroupBy(x => x.CreatedAt.Date)
            .Select(g => new
            {
                Date = g.Key,
                InvoiceCount = g.Count()
            })
            .ToListAsync(cancellationToken);

        var revenueDictionary = revenueData
            .ToDictionary(x => x.Date.Date, x => x.Revenue);

        var orderDictionary = orderData
            .ToDictionary(x => x.Date.Date, x => x.OrderCount);

        var invoiceDictionary = invoiceData
            .ToDictionary(x => x.Date.Date, x => x.InvoiceCount);

        var totalDays = (toDate - fromDate).Days + 1;

        return Enumerable.Range(0, totalDays)
            .Select(index =>
            {
                var date = fromDate.AddDays(index).Date;

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
        DateTime fromDate,
        DateTime toDateExclusive,
        int top,
        CancellationToken cancellationToken)
    {
        var validOrderIdsQuery = _context.Orders
            .AsNoTracking()
            .Where(x =>
                x.CreatedAt >= fromDate &&
                x.CreatedAt < toDateExclusive &&
                x.Status != "Cancelled")
            .Select(x => x.Id);

        return await _context.OrderItems
            .AsNoTracking()
            .Where(x =>
                validOrderIdsQuery.Contains(x.OrderId) &&
                x.Status != "Cancelled")
            .GroupBy(x => new
            {
                x.MenuItemId,
                x.MenuItemName
            })
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
            .Where(x =>
                x.IsActive &&
                x.CurrentStock <= x.MinimumStock)
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