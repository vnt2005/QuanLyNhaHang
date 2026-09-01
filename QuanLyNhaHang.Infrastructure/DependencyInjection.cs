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

        services.Configure<OpenAiOptions>(options =>
        {
            options.ApiKey = configuration[$"{OpenAiOptions.SectionName}:ApiKey"]
                ?? configuration["OPENAI_API_KEY"]
                ?? string.Empty;
            options.BaseUrl = configuration[$"{OpenAiOptions.SectionName}:BaseUrl"]
                ?? "https://api.openai.com/v1";
            options.DefaultModel = configuration[$"{OpenAiOptions.SectionName}:DefaultModel"]
                ?? "gpt-5.6-luna";
        });

        services.AddHttpClient<IAiAssistantService, OpenAiAssistantService>(client =>
        {
            client.Timeout = TimeSpan.FromSeconds(45);
        });

        return services;
    }
}
