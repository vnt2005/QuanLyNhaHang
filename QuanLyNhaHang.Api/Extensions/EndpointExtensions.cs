namespace QuanLyNhaHang.Api.Extensions;

public static class EndpointExtensions
{
    public static WebApplication MapApiEndpoints(this WebApplication app)
    {
        if (app.Environment.IsDevelopment())
            app.MapOpenApi();

        app.MapHealthChecks(
            "/health",
            new HealthCheckOptions
            {
                Predicate = registration =>
                    registration.Tags.Contains("live"),
                ResponseWriter = HealthCheckResponseWriter.WriteAsync
            });

        app.MapHealthChecks(
            "/health/live",
            new HealthCheckOptions
            {
                Predicate = registration =>
                    registration.Tags.Contains("live"),
                ResponseWriter = HealthCheckResponseWriter.WriteAsync
            });

        app.MapHealthChecks(
            "/health/ready",
            new HealthCheckOptions
            {
                Predicate = registration =>
                    registration.Tags.Contains("ready"),
                ResponseWriter = HealthCheckResponseWriter.WriteAsync
            });

        app.MapControllers();

        app.MapHub<AdminNotificationHub>(
            "/hubs/admin-notifications",
            options => options.CloseOnAuthenticationExpiration = true);

        return app;
    }
}
