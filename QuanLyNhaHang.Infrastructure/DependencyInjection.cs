using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using QuanLyNhaHang.Application.Common.Interfaces;
using QuanLyNhaHang.Application.Common.Payments;
using QuanLyNhaHang.Infrastructure.AI;
using QuanLyNhaHang.Infrastructure.Payments.SePay;
using QuanLyNhaHang.Infrastructure.Persistence;
using QuanLyNhaHang.Infrastructure.Services;

namespace QuanLyNhaHang.Infrastructure;

public static class DependencyInjection
{
    public static IServiceCollection AddInfrastructure(
        this IServiceCollection services,
        IConfiguration configuration)
    {
        services.AddDbContext<ApplicationDbContext>(options =>
        {
            options.UseSqlServer(
                configuration.GetConnectionString("DefaultConnection"));
        });

        services.AddScoped<IApplicationDbContext>(provider =>
            provider.GetRequiredService<ApplicationDbContext>());

        services.AddScoped<IPasswordHasher, PasswordHasher>();

        services.AddScoped<IJwtTokenService, JwtTokenService>();

        services.AddScoped<IAuthSessionService, AuthSessionService>();

        services.AddScoped<IEmailService, EmailService>();

        services.AddScoped<IActivityLogService, ActivityLogService>();

        services.AddScoped<IUserPermissionService, UserPermissionService>();

        services.AddScoped<UnpaidTakeawayOrderExpiryProcessor>();
        services.AddHostedService<UnpaidTakeawayOrderExpiryService>();

        services.Configure<SePayOptions>(
            configuration.GetSection(SePayOptions.SectionName));

        services.AddSingleton<IPaymentGateway, SePayPaymentGateway>();
        services.AddSingleton<IPaymentWebhookAdapter, SePayWebhookParser>();
        services.AddSingleton<IPaymentChannelReadiness, SePayWebhookReadiness>();

        services.Configure<GeminiOptions>(options =>
        {
            options.ApiKey = configuration[$"{GeminiOptions.SectionName}:ApiKey"]
                ?? configuration["GEMINI_API_KEY"]
                ?? string.Empty;
            options.BaseUrl = configuration[$"{GeminiOptions.SectionName}:BaseUrl"]
                ?? "https://generativelanguage.googleapis.com/v1beta";
            options.DefaultModel = configuration[$"{GeminiOptions.SectionName}:DefaultModel"]
                ?? "gemini-3.7-flash";
        });

        services.AddTransient<GeminiRequestNormalizationHandler>();
        services.AddHttpClient<IAiAssistantService, GeminiAiAssistantService>(client =>
        {
            // GeminiAiAssistantService owns the linked 60-second conversation
            // timeout. An independent HttpClient timeout used to throw a
            // TaskCanceledException first and bypass the service fallback.
            client.Timeout = Timeout.InfiniteTimeSpan;
        })
        .AddHttpMessageHandler<GeminiRequestNormalizationHandler>();

        return services;
    }
}
