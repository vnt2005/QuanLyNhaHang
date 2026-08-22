using Microsoft.EntityFrameworkCore;
using QuanLyNhaHang.Infrastructure.Persistence;

namespace QuanLyNhaHang.Api.Services;

public sealed class IdempotencyCleanupService : BackgroundService
{
    private static readonly TimeSpan CleanupInterval =
        TimeSpan.FromMinutes(15);

    private readonly IServiceScopeFactory _scopeFactory;
    private readonly ILogger<IdempotencyCleanupService> _logger;

    public IdempotencyCleanupService(
        IServiceScopeFactory scopeFactory,
        ILogger<IdempotencyCleanupService> logger)
    {
        _scopeFactory = scopeFactory;
        _logger = logger;
    }

    protected override async Task ExecuteAsync(
        CancellationToken stoppingToken)
    {
        using var timer = new PeriodicTimer(CleanupInterval);

        while (await timer.WaitForNextTickAsync(stoppingToken))
        {
            try
            {
                await using var scope = _scopeFactory.CreateAsyncScope();
                var dbContext = scope.ServiceProvider
                    .GetRequiredService<ApplicationDbContext>();

                var deleted = await dbContext.IdempotencyRecords
                    .Where(record => record.ExpiresAt <= DateTime.UtcNow)
                    .ExecuteDeleteAsync(stoppingToken);

                if (deleted > 0)
                {
                    _logger.LogInformation(
                        "Đã xóa {RecordCount} idempotency record hết hạn.",
                        deleted);
                }
            }
            catch (OperationCanceledException)
                when (stoppingToken.IsCancellationRequested)
            {
                break;
            }
            catch (Exception exception)
            {
                _logger.LogWarning(
                    exception,
                    "Không thể dọn idempotency record hết hạn.");
            }
        }
    }
}
