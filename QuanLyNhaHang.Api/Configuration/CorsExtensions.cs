namespace QuanLyNhaHang.Api.Configuration;

public static class CorsExtensions
{
    public const string FrontendPolicy = "Frontend";

    public static IServiceCollection AddApiCors(
        this IServiceCollection services,
        IConfiguration configuration,
        IHostEnvironment environment)
    {
        var allowedOrigins = configuration
            .GetSection("Cors:AllowedOrigins")
            .GetChildren()
            .Select(section => section.Value?.Trim().TrimEnd('/'))
            .Where(origin => !string.IsNullOrWhiteSpace(origin))
            .Select(origin => origin!)
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .ToArray();

        if (allowedOrigins.Length == 0 && environment.IsDevelopment())
        {
            allowedOrigins =
            [
                "http://localhost:5173",
                "https://localhost:5173",
                "http://localhost:5174",
                "https://localhost:5174"
            ];
        }

        services.AddCors(options =>
        {
            options.AddPolicy(FrontendPolicy, policy =>
            {
                if (allowedOrigins.Length == 0)
                    return;

                policy
                    .WithOrigins(allowedOrigins)
                    .AllowAnyHeader()
                    .AllowAnyMethod()
                    .AllowCredentials();
            });
        });

        return services;
    }
}
