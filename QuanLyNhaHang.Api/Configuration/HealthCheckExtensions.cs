namespace QuanLyNhaHang.Api.Configuration;

public static class HealthCheckExtensions
{
    public static IServiceCollection AddApiHealthChecks(
        this IServiceCollection services)
    {
        services
            .AddHealthChecks()
            .AddCheck(
                "self",
                () => HealthCheckResult.Healthy(
                    "Tiến trình API đang hoạt động."),
                tags: ["live", "ready"])
            .AddCheck<DatabaseHealthCheck>(
                "database",
                tags: ["ready"]);

        return services;
    }
}
