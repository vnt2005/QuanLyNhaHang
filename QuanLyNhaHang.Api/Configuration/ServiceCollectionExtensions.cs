using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.ModelBinding;

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

        services.Configure<ApiBehaviorOptions>(options =>
        {
            options.InvalidModelStateResponseFactory = context =>
            {
                var errors = context.ModelState
                    .Where(entry => entry.Value?.Errors.Count > 0)
                    .ToDictionary(
                        entry => entry.Key,
                        entry => entry.Value!.Errors
                            .Select(ToClientValidationMessage)
                            .Distinct(StringComparer.Ordinal)
                            .ToArray());

                var flattenedErrors = errors.Values
                    .SelectMany(value => value)
                    .ToArray();

                // When JSON deserialization fails, ASP.NET Core can also add an
                // implicit "command field is required" model-binding error.
                // Prefer the sanitized malformed-payload message so clients do
                // not receive a misleading parameter-level validation message.
                var message = flattenedErrors
                    .FirstOrDefault(value => string.Equals(
                        value,
                        "Dữ liệu gửi lên không đúng định dạng.",
                        StringComparison.Ordinal))
                    ?? flattenedErrors.FirstOrDefault()
                    ?? "Dữ liệu không hợp lệ.";

                return new BadRequestObjectResult(new
                {
                    type = "about:blank",
                    title = "Dữ liệu không hợp lệ",
                    status = StatusCodes.Status400BadRequest,
                    message,
                    errors
                });
            };
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

    private static string ToClientValidationMessage(ModelError error)
    {
        if (error.Exception is not null)
            return "Dữ liệu gửi lên không đúng định dạng.";

        var message = error.ErrorMessage?.Trim();
        if (string.IsNullOrWhiteSpace(message))
            return "Dữ liệu không hợp lệ.";

        if (message.Contains("could not be converted", StringComparison.OrdinalIgnoreCase)
            || message.Contains("JSON", StringComparison.OrdinalIgnoreCase)
            || message.Contains("System.", StringComparison.OrdinalIgnoreCase))
        {
            return "Dữ liệu gửi lên không đúng định dạng.";
        }

        return message;
    }
}
