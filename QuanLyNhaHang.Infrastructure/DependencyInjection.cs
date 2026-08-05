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

        return services;
    }
}
