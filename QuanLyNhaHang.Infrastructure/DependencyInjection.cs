using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using QuanLyNhaHang.Application.Common.Interfaces;
using QuanLyNhaHang.Infrastructure.Persistence;
using QuanLyNhaHang.Infrastructure.Services;

namespace QuanLyNhaHang.Infrastructure;

public static class DependencyInjection
{
    public static IServiceCollection AddInfrastructure(
        this IServiceCollection services,
        IConfiguration configuration)
    {
        var connectionString = configuration
            .GetConnectionString("DefaultConnection");

        if (string.IsNullOrWhiteSpace(connectionString))
        {
            throw new InvalidOperationException(
                "ConnectionStrings:DefaultConnection chưa được cấu hình.");
        }

        services.AddDbContext<ApplicationDbContext>(options =>
        {
            options.UseSqlServer(
                connectionString,
                sqlServerOptions =>
                {
                    sqlServerOptions.EnableRetryOnFailure(
                        maxRetryCount: 5,
                        maxRetryDelay: TimeSpan.FromSeconds(10),
                        errorNumbersToAdd: null);
                });
        });

        services.AddScoped<IApplicationDbContext>(provider =>
            provider.GetRequiredService<ApplicationDbContext>());

        services.AddScoped<IPasswordHasher, PasswordHasher>();

        services.AddScoped<IJwtTokenService, JwtTokenService>();

        services.AddScoped<IAuthSessionService, AuthSessionService>();

        services.AddScoped<IEmailService, EmailService>();

        services.AddScoped<IActivityLogService, ActivityLogService>();

        services.AddScoped<IUserPermissionService, UserPermissionService>();

        return services;
    }
}
