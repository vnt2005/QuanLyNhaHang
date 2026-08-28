using System.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using QuanLyNhaHang.Application.Common.Interfaces;
using QuanLyNhaHang.Application.Common.Notifications;
using QuanLyNhaHang.Application.Features.Notifications.DTOs;
using QuanLyNhaHang.Domain.Entities;
using QuanLyNhaHang.Infrastructure.Persistence;

namespace QuanLyNhaHang.Infrastructure.Services;

public sealed class UnpaidTakeawayOrderExpiryProcessor
{
    public static readonly TimeSpan PaymentGracePeriod = TimeSpan.FromMinutes(5);

    private readonly ApplicationDbContext _context;
    private readonly IAdminNotificationPublisher _notificationPublisher;
    private readonly ILogger<UnpaidTakeawayOrderExpiryProcessor> _logger;

    public UnpaidTakeawayOrderExpiryProcessor(
        ApplicationDbContext context,
        IAdminNotificationPublisher notificationPublisher,
        ILogger<UnpaidTakeawayOrderExpiryProcessor> logger)
    {
        _context = context;
        _notificationPublisher = notificationPublisher;
        _logger = logger;
    }

    public async Task<int> CompletePaidFinishedAsync(
        CancellationToken cancellationToken = default)
    {
        var candidateIds = await _context.Orders
            .AsNoTracking()
            .Where(order =>
                order.IsActive &&
                order.OrderType == "Takeaway" &&
                (order.Status == "Ready" || order.Status == "Served") &&
                _context.Payments.Any(payment =>
                    payment.OrderId == order.Id && payment.Status == "Paid"))
            .OrderBy(order => order.CreatedAt)
            .Select(order => order.Id)
            .ToListAsync(cancellationToken);

        var completedCount = 0;

        foreach (var orderId in candidateIds)
        {
            cancellationToken.ThrowIfCancellationRequested();
            _context.ChangeTracker.Clear();

            try
            {
                await using var transaction = _context.Database.IsRelational()
                    ? await _context.Database.BeginTransactionAsync(IsolationLevel.Serializable, cancellationToken)
                    : null;

                var order = await _context.Orders.FirstOrDefaultAsync(item => item.Id == orderId, cancellationToken);
                if (order is null || !order.IsActive || order.OrderType != "Takeaway" || order.Status is not ("Ready" or "Served"))
                {
                    if (transaction is not null) await transaction.RollbackAsync(cancellationToken);
                    continue;
                }

                var paid = await _context.Payments.AsNoTracking().AnyAsync(
                    payment => payment.OrderId == order.Id && payment.Status == "Paid",
                    cancellationToken);
                if (!paid)
                {
                    if (transaction is not null) await transaction.RollbackAsync(cancellationToken);
                    continue;
                }

                var orderItems = await _context.OrderItems.Where(item => item.OrderId == order.Id).ToListAsync(cancellationToken);
                var activeItems = orderItems.Where(item => item.Status != "Cancelled").ToList();
                if (activeItems.Count == 0 || activeItems.Any(item => item.Status is not ("Ready" or "Served")))
                {
                    if (transaction is not null) await transaction.RollbackAsync(cancellationToken);
                    continue;
                }

                foreach (var item in activeItems.Where(item => item.Status == "Ready")) item.MarkServed();
                order.MarkCompleted();

                var notifications = new List<Notification>();
                if (order.CustomerUserId.HasValue)
                {
                    notifications.Add(new Notification(
                        order.CustomerUserId.Value,
                        "Order.CompletedAfterPayment",
                        "Đơn đã hoàn tất",
                        $"Đơn mang về {order.OrderCode} đã nấu xong và thanh toán thành công.",
                        "success",
                        "/orders",
                        order.Id));
                }

                var adminUserIds = await _context.Users.AsNoTracking()
                    .Where(user => user.IsActive && user.IsEmailVerified && AdminNotificationAudience.OrderRoles.Contains(user.Role))
                    .Select(user => user.Id)
                    .ToListAsync(cancellationToken);

                notifications.AddRange(adminUserIds.Select(userId => new Notification(
                    userId,
                    "Order.CompletedAfterPayment",
                    "Đơn mang về đã hoàn tất",
                    $"Đơn {order.OrderCode} đã nấu xong và có Payment Paid nên hệ thống đã chốt hoàn tất.",
                    "success",
                    "Đơn hàng",
                    order.Id)));

                if (notifications.Count > 0)
                    await _context.Notifications.AddRangeAsync(notifications, cancellationToken);

                await _context.SaveChangesAsync(cancellationToken);
                if (transaction is not null) await transaction.CommitAsync(cancellationToken);

                if (notifications.Count > 0)
                    await _notificationPublisher.PublishAsync(notifications.Select(NotificationDto.FromEntity).ToArray(), cancellationToken);

                completedCount++;
                _logger.LogInformation(
                    "Đã tự động hoàn tất đơn mang về {OrderCode} vì bếp đã hoàn thành và Payment đã Paid.",
                    order.OrderCode);
            }
            catch (DbUpdateConcurrencyException exception)
            {
                _logger.LogInformation(
                    exception,
                    "Bỏ qua lần tự hoàn tất order {OrderId} vì dữ liệu vừa thay đổi đồng thời; hệ thống sẽ kiểm tra lại ở chu kỳ kế tiếp.",
                    orderId);
            }
        }

        return completedCount;
    }

    public async Task<int> CancelExpiredAsync(
        CancellationToken cancellationToken = default,
        TimeSpan? gracePeriod = null)
    {
        var effectiveGracePeriod = gracePeriod ?? PaymentGracePeriod;
        if (effectiveGracePeriod < TimeSpan.Zero)
            throw new ArgumentOutOfRangeException(nameof(gracePeriod));

        var candidateIds = await _context.Orders
            .AsNoTracking()
            .Where(order => order.IsActive && order.OrderType == "Takeaway" && order.Status == "Ready")
            .OrderBy(order => order.CreatedAt)
            .Select(order => order.Id)
            .ToListAsync(cancellationToken);

        var cancelledCount = 0;

        foreach (var orderId in candidateIds)
        {
            cancellationToken.ThrowIfCancellationRequested();
            _context.ChangeTracker.Clear();

            try
            {
                await using var transaction = _context.Database.IsRelational()
                    ? await _context.Database.BeginTransactionAsync(IsolationLevel.Serializable, cancellationToken)
                    : null;

                var order = await _context.Orders.FirstOrDefaultAsync(item => item.Id == orderId, cancellationToken);
                if (order is null || !order.IsActive || order.OrderType != "Takeaway" || order.Status != "Ready")
                {
                    if (transaction is not null) await transaction.RollbackAsync(cancellationToken);
                    continue;
                }

                var alreadyPaid = await _context.Payments.AsNoTracking().AnyAsync(
                    payment => payment.OrderId == order.Id && payment.Status == "Paid",
                    cancellationToken);
                if (alreadyPaid)
                {
                    if (transaction is not null) await transaction.RollbackAsync(cancellationToken);
                    continue;
                }

                var paymentAttempts = await _context.PaymentAttempts
                    .Where(attempt => attempt.OrderId == order.Id)
                    .ToListAsync(cancellationToken);
                if (paymentAttempts.Any(attempt =>
                        attempt.Status == PaymentAttempt.PaidStatus ||
                        attempt.Status == PaymentAttempt.RequiresReviewStatus))
                {
                    if (transaction is not null) await transaction.RollbackAsync(cancellationToken);
                    continue;
                }

                var orderItems = await _context.OrderItems.Where(item => item.OrderId == order.Id).ToListAsync(cancellationToken);
                var activeItems = orderItems.Where(item => item.Status != "Cancelled").ToList();
                if (activeItems.Count == 0 || activeItems.Any(item => item.Status != "Ready" || !item.CompletedAt.HasValue))
                {
                    if (transaction is not null) await transaction.RollbackAsync(cancellationToken);
                    continue;
                }

                var readyAt = activeItems.Max(item => item.CompletedAt!.Value);
                if (DateTime.UtcNow - readyAt < effectiveGracePeriod)
                {
                    if (transaction is not null) await transaction.RollbackAsync(cancellationToken);
                    continue;
                }

                foreach (var attempt in paymentAttempts.Where(attempt =>
                             attempt.Status == PaymentAttempt.CreatingStatus ||
                             attempt.Status == PaymentAttempt.PendingStatus))
                    attempt.MarkCancelled("OrderAutoCancelledAfterReadyPaymentTimeout");

                order.Cancel();
                foreach (var item in activeItems) item.Cancel();

                var notifications = new List<Notification>();
                if (order.CustomerUserId.HasValue)
                {
                    notifications.Add(new Notification(
                        order.CustomerUserId.Value,
                        "Order.AutoCancelledPaymentTimeout",
                        "Đơn đã tự động hủy do quá hạn thanh toán",
                        $"Đơn {order.OrderCode} đã nấu xong nhưng chưa thanh toán trong 5 phút nên hệ thống đã tự động hủy.",
                        "warning",
                        "/orders",
                        order.Id));
                }

                var adminUserIds = await _context.Users.AsNoTracking()
                    .Where(user => user.IsActive && user.IsEmailVerified && AdminNotificationAudience.OrderRoles.Contains(user.Role))
                    .Select(user => user.Id)
                    .ToListAsync(cancellationToken);

                notifications.AddRange(adminUserIds.Select(userId => new Notification(
                    userId,
                    "Order.AutoCancelledPaymentTimeout",
                    "Đơn tự động hủy do chưa thanh toán",
                    $"Đơn {order.OrderCode} đã quá 5 phút kể từ khi bếp hoàn thành nhưng chưa có Payment Paid nên hệ thống đã tự động hủy.",
                    "warning",
                    "Đơn hàng",
                    order.Id)));

                if (notifications.Count > 0)
                    await _context.Notifications.AddRangeAsync(notifications, cancellationToken);

                await _context.SaveChangesAsync(cancellationToken);
                if (transaction is not null) await transaction.CommitAsync(cancellationToken);

                if (notifications.Count > 0)
                    await _notificationPublisher.PublishAsync(notifications.Select(NotificationDto.FromEntity).ToArray(), cancellationToken);

                cancelledCount++;
                _logger.LogInformation(
                    "Đã tự động hủy đơn mang về {OrderCode} do chưa thanh toán sau {GraceMinutes} phút kể từ lúc bếp hoàn thành.",
                    order.OrderCode,
                    effectiveGracePeriod.TotalMinutes);
            }
            catch (DbUpdateConcurrencyException exception)
            {
                _logger.LogInformation(
                    exception,
                    "Bỏ qua lần tự hủy order {OrderId} vì dữ liệu vừa thay đổi đồng thời; hệ thống sẽ kiểm tra lại ở chu kỳ kế tiếp.",
                    orderId);
            }
        }

        return cancelledCount;
    }
}

public sealed class UnpaidTakeawayOrderExpiryService : BackgroundService
{
    private static readonly TimeSpan CheckInterval = TimeSpan.FromSeconds(15);

    private readonly IServiceScopeFactory _scopeFactory;
    private readonly ILogger<UnpaidTakeawayOrderExpiryService> _logger;

    public UnpaidTakeawayOrderExpiryService(
        IServiceScopeFactory scopeFactory,
        ILogger<UnpaidTakeawayOrderExpiryService> logger)
    {
        _scopeFactory = scopeFactory;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        await RunSweepAsync(stoppingToken);

        using var timer = new PeriodicTimer(CheckInterval);
        while (await timer.WaitForNextTickAsync(stoppingToken))
            await RunSweepAsync(stoppingToken);
    }

    private async Task RunSweepAsync(CancellationToken stoppingToken)
    {
        try
        {
            await using var scope = _scopeFactory.CreateAsyncScope();
            var processor = scope.ServiceProvider.GetRequiredService<UnpaidTakeawayOrderExpiryProcessor>();

            await processor.CompletePaidFinishedAsync(stoppingToken);
            await processor.CancelExpiredAsync(stoppingToken);
        }
        catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
        {
        }
        catch (Exception exception)
        {
            _logger.LogWarning(
                exception,
                "Không thể đồng bộ trạng thái hoặc kiểm tra các đơn mang về quá hạn thanh toán.");
        }
    }
}
