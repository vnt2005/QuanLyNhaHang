namespace QuanLyNhaHang.Api.Configuration;

public static class ServiceCollectionExtensions
{
    public static WebApplicationBuilder ConfigureApiHost(
        this WebApplicationBuilder builder)
    {
        builder.WebHost.ConfigureKestrel(options =>
        {
            options.Limits.MaxRequestBodySize = 1_048_576;
        });

        return builder;
    }

    public static IServiceCollection AddApiServices(
        this IServiceCollection services,
        IConfiguration configuration)
    {
        services.AddApplication();
        services.AddInfrastructure(configuration);
        services.AddHttpContextAccessor();
        services.AddSignalR();

        services.AddScoped<ICurrentUserService, CurrentUserService>();

        services.AddSingleton<
            IAdminNotificationPublisher,
            SignalRAdminNotificationPublisher>();

        services.AddHostedService<IdempotencyCleanupService>();

        services
            .AddControllers()
            .AddJsonOptions(options =>
            {
                options.JsonSerializerOptions.Converters.Add(
                    new UtcDateTimeJsonConverter());
            });

        services.AddOpenApi();

        return services;
    }

    public static IServiceCollection AddApiAuthorization(
        this IServiceCollection services)
    {
        services.AddAuthorization();

        services.AddSingleton<
            IAuthorizationPolicyProvider,
            PermissionAuthorizationPolicyProvider>();

        services.AddScoped<
            IAuthorizationHandler,
            PermissionAuthorizationHandler>();

        return services;
    }
}
