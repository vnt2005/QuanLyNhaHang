using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Diagnostics.HealthChecks;
using QuanLyNhaHang.Infrastructure.Persistence;

namespace QuanLyNhaHang.Api.Health;

public sealed class DatabaseHealthCheck(
    IServiceScopeFactory scopeFactory,
    ILogger<DatabaseHealthCheck> logger) : IHealthCheck
{
    public async Task<HealthCheckResult> CheckHealthAsync(
        HealthCheckContext context,
        CancellationToken cancellationToken = default)
    {
        try
        {
            await using var scope = scopeFactory.CreateAsyncScope();
            var dbContext = scope.ServiceProvider
                .GetRequiredService<ApplicationDbContext>();

            var canConnect = await dbContext.Database
                .CanConnectAsync(cancellationToken);

            return canConnect
                ? HealthCheckResult.Healthy(
                    "Kết nối cơ sở dữ liệu hoạt động bình thường.")
                : HealthCheckResult.Unhealthy(
                    "Không thể kết nối cơ sở dữ liệu.");
        }
        catch (Exception exception)
        {
            logger.LogWarning(
                exception,
                "Kiểm tra trạng thái cơ sở dữ liệu thất bại.");

            return HealthCheckResult.Unhealthy(
                "Kiểm tra trạng thái cơ sở dữ liệu thất bại.");
        }
    }
}
