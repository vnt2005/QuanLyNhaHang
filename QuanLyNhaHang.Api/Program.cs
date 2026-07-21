using MediatR;
using Microsoft.EntityFrameworkCore;
using QuanLyNhaHang.Application.Common.Constants;
using QuanLyNhaHang.Application.Features.Permissions.Commands.SyncCatalog;
using QuanLyNhaHang.Application.Features.Roles.Commands.SyncSystem;
using QuanLyNhaHang.Infrastructure.Persistence;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddApplication();

builder.Services.AddInfrastructure(builder.Configuration);

builder.Services.AddHttpContextAccessor();

builder.Services.AddScoped<ICurrentUserService, CurrentUserService>();

builder.Services.AddControllers();

builder.Services.AddOpenApi();

builder.Services.AddHealthChecks();

builder.Services.AddAuthentication(options =>
{
    options.DefaultAuthenticateScheme = JwtBearerDefaults.AuthenticationScheme;
    options.DefaultChallengeScheme = JwtBearerDefaults.AuthenticationScheme;
})
.AddJwtBearer(options =>
{
    var secretKey = builder.Configuration["Jwt:SecretKey"];

    if (string.IsNullOrWhiteSpace(secretKey))
    {
        throw new Exception("JWT SecretKey chưa được cấu hình.");
    }

    options.TokenValidationParameters = new TokenValidationParameters
    {
        ValidateIssuer = true,
        ValidateAudience = true,
        ValidateLifetime = true,
        ValidateIssuerSigningKey = true,
        NameClaimType = ClaimTypes.Name,
        RoleClaimType = ClaimTypes.Role,
        ClockSkew = TimeSpan.Zero,

        ValidIssuer = builder.Configuration["Jwt:Issuer"],
        ValidAudience = builder.Configuration["Jwt:Audience"],
        IssuerSigningKey = new SymmetricSecurityKey(
            Encoding.UTF8.GetBytes(secretKey))
    };

    options.Events = new JwtBearerEvents
    {
        OnTokenValidated = async context =>
        {
            var userIdValue = context.Principal?
                .FindFirstValue(ClaimTypes.NameIdentifier);
            var sessionIdValue = context.Principal?
                .FindFirstValue(CustomClaimTypes.SessionId);

            if (!Guid.TryParse(userIdValue, out var userId) ||
                !Guid.TryParse(sessionIdValue, out var sessionId))
            {
                context.Fail("JWT không chứa phiên đăng nhập hợp lệ.");
                return;
            }

            var cancellationToken = context.HttpContext.RequestAborted;
            var services = context.HttpContext.RequestServices;
            var dbContext = services.GetRequiredService<IApplicationDbContext>();
            var authSessionService = services.GetRequiredService<IAuthSessionService>();

            var userIsActive = await dbContext.Users
                .AsNoTracking()
                .AnyAsync(
                    user => user.Id == userId && user.IsActive,
                    cancellationToken);

            if (!userIsActive)
            {
                context.Fail("Tài khoản không còn hoạt động.");
                return;
            }

            var sessionIsActive = await authSessionService.IsActiveAsync(
                userId,
                sessionId,
                cancellationToken);

            if (!sessionIsActive)
                context.Fail("Phiên đăng nhập đã hết hạn hoặc bị thu hồi.");
        }
    };
});
builder.Services.AddRateLimiter(options =>
{
    options.RejectionStatusCode =
        StatusCodes.Status429TooManyRequests;

    options.AddPolicy("AuthLogin", context =>
    {
        var ip = context.Connection.RemoteIpAddress?.ToString()
                 ?? "unknown";

        return RateLimitPartition.GetFixedWindowLimiter(
            partitionKey: $"auth-login:{ip}",
            factory: _ => new FixedWindowRateLimiterOptions
            {
                PermitLimit = 10,
                Window = TimeSpan.FromMinutes(1),
                QueueLimit = 0,
                QueueProcessingOrder =
                    QueueProcessingOrder.OldestFirst,
                AutoReplenishment = true
            });
    });

    options.AddPolicy("AuthSensitive", context =>
    {
        var ip = context.Connection.RemoteIpAddress?.ToString()
                 ?? "unknown";

        var path = context.Request.Path.Value ?? "unknown";

        return RateLimitPartition.GetFixedWindowLimiter(
            partitionKey: $"auth-sensitive:{ip}:{path}",
            factory: _ => new FixedWindowRateLimiterOptions
            {
                PermitLimit = 5,
                Window = TimeSpan.FromMinutes(5),
                QueueLimit = 0,
                QueueProcessingOrder =
                    QueueProcessingOrder.OldestFirst,
                AutoReplenishment = true
            });
    });

    options.AddPolicy("QrBrowse", context =>
    RateLimitPartition.GetFixedWindowLimiter(
        partitionKey:
            context.Connection.RemoteIpAddress?.ToString()
            ?? "unknown",
        factory: _ => new FixedWindowRateLimiterOptions
        {
            PermitLimit = 60,
            Window = TimeSpan.FromMinutes(1),
            QueueLimit = 0,
            QueueProcessingOrder =
                QueueProcessingOrder.OldestFirst,
            AutoReplenishment = true
        }));

    options.AddPolicy("QrCreate", context =>
    {
        var ip = context.Connection.RemoteIpAddress?.ToString()
                 ?? "unknown";

        var token =
            Convert.ToString(context.Request.RouteValues["token"])
            ?? "unknown";

        return RateLimitPartition.GetFixedWindowLimiter(
            partitionKey: $"{ip}:{token}",
            factory: _ => new FixedWindowRateLimiterOptions
            {
                PermitLimit = 10,
                Window = TimeSpan.FromMinutes(1),
                QueueLimit = 0,
                QueueProcessingOrder =
                    QueueProcessingOrder.OldestFirst,
                AutoReplenishment = true
            });
    });
});


builder.Services.AddAuthorization();

builder.Services.AddSingleton<
    IAuthorizationPolicyProvider,
    PermissionAuthorizationPolicyProvider>();

builder.Services.AddScoped<
    IAuthorizationHandler,
    PermissionAuthorizationHandler>();

var app = builder.Build();

var applyMigrationsOnStartup = app.Configuration.GetValue<bool>(
    "Database:ApplyMigrationsOnStartup");
var syncPermissionCatalogOnStartup = app.Configuration.GetValue<bool?>(
    "Database:SyncPermissionCatalogOnStartup") ?? applyMigrationsOnStartup;
var syncSystemRolesOnStartup = app.Configuration.GetValue<bool?>(
    "Database:SyncSystemRolesOnStartup") ?? syncPermissionCatalogOnStartup;

if (applyMigrationsOnStartup ||
    syncPermissionCatalogOnStartup ||
    syncSystemRolesOnStartup)
{
    using var scope = app.Services.CreateScope();

    if (applyMigrationsOnStartup)
    {
        var dbContext = scope.ServiceProvider
            .GetRequiredService<ApplicationDbContext>();

        await dbContext.Database.MigrateAsync();
    }

    var mediator = scope.ServiceProvider.GetRequiredService<IMediator>();

    if (syncPermissionCatalogOnStartup || syncSystemRolesOnStartup)
        await mediator.Send(new SyncPermissionCatalogCommand());

    if (syncSystemRolesOnStartup)
        await mediator.Send(new SyncSystemRolesCommand());
}

if (app.Environment.IsDevelopment())
{
    app.MapOpenApi();
}

if (!app.Configuration.GetValue<bool>(
        "Hosting:DisableHttpsRedirection"))
{
    app.UseHttpsRedirection();
}

app.UseMiddleware<ExceptionHandlingMiddleware>();

app.UseRouting();

app.UseRateLimiter();

app.UseAuthentication();

app.UseAuthorization();

app.MapHealthChecks("/health");

app.MapControllers();

app.Run();

public partial class Program
{
}
