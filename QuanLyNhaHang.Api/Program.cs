using MediatR;
using Microsoft.AspNetCore.Diagnostics.HealthChecks;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Diagnostics.HealthChecks;
using System.Globalization;
using System.Text.Json;
using QuanLyNhaHang.Api.Health;
using QuanLyNhaHang.Api.Hubs;
using QuanLyNhaHang.Api.Serialization;
using QuanLyNhaHang.Application.Common.Constants;
using QuanLyNhaHang.Application.Features.Permissions.Commands.SyncCatalog;
using QuanLyNhaHang.Application.Features.Roles.Commands.SyncSystem;
using QuanLyNhaHang.Infrastructure.Persistence;

var builder = WebApplication.CreateBuilder(args);

builder.WebHost.ConfigureKestrel(options =>
{
    options.Limits.MaxRequestBodySize = 1_048_576;
});

const string frontendCorsPolicy = "Frontend";

var allowedOrigins = builder.Configuration
    .GetSection("Cors:AllowedOrigins")
    .GetChildren()
    .Select(section => section.Value?.Trim().TrimEnd('/'))
    .Where(origin => !string.IsNullOrWhiteSpace(origin))
    .Select(origin => origin!)
    .Distinct(StringComparer.OrdinalIgnoreCase)
    .ToArray();

if (allowedOrigins.Length == 0 && builder.Environment.IsDevelopment())
{
    allowedOrigins =
    [
        "http://localhost:5173",
        "https://localhost:5173",
        "http://localhost:5174",
        "https://localhost:5174"
    ];
}

builder.Services.AddCors(options =>
{
    options.AddPolicy(frontendCorsPolicy, policy =>
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

builder.Services.AddApplication();

builder.Services.AddInfrastructure(builder.Configuration);

builder.Services.AddHttpContextAccessor();

builder.Services.AddSignalR();

builder.Services.AddScoped<ICurrentUserService, CurrentUserService>();

builder.Services.AddSingleton<
    IAdminNotificationPublisher,
    SignalRAdminNotificationPublisher>();

builder.Services.AddHostedService<IdempotencyCleanupService>();

builder.Services
    .AddControllers()
    .AddJsonOptions(options =>
    {
        options.JsonSerializerOptions.Converters.Add(
            new UtcDateTimeJsonConverter());
    });

builder.Services.AddOpenApi();

builder.Services
    .AddHealthChecks()
    .AddCheck(
        "self",
        () => HealthCheckResult.Healthy(
            "Tiến trình API đang hoạt động."),
        tags: ["live", "ready"])
    .AddCheck<DatabaseHealthCheck>(
        "database",
        tags: ["ready"]);

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
        OnMessageReceived = context =>
        {
            var accessToken = context.Request.Query["access_token"]
                .ToString();
            var path = context.HttpContext.Request.Path;

            if (!string.IsNullOrEmpty(accessToken) &&
                path.StartsWithSegments("/hubs/admin-notifications"))
            {
                context.Token = accessToken;
            }

            return Task.CompletedTask;
        },
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

            var userCanAuthenticate = await dbContext.Users
                .AsNoTracking()
                .AnyAsync(
                    user => user.Id == userId &&
                            user.IsActive &&
                            user.IsEmailVerified,
                    cancellationToken);

            if (!userCanAuthenticate)
            {
                context.Fail("Tài khoản không đủ điều kiện đăng nhập.");
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
static string ResolveRateLimitActor(HttpContext context)
{
    var userId = context.User.FindFirstValue(ClaimTypes.NameIdentifier);
    if (!string.IsNullOrWhiteSpace(userId))
        return $"user:{userId}";

    var clientId = context.Request.Headers["X-Client-Id"]
        .ToString()
        .Trim();
    if (clientId.Length is >= 8 and <= 128 &&
        clientId.All(character =>
            char.IsAsciiLetterOrDigit(character) ||
            character is '-' or '_' or '.'))
    {
        return $"client:{clientId}";
    }

    return $"ip:{context.Connection.RemoteIpAddress?.ToString() ?? "unknown"}";
}

static SlidingWindowRateLimiterOptions SlidingWindow(
    int permitLimit,
    TimeSpan window,
    int segmentsPerWindow)
{
    return new SlidingWindowRateLimiterOptions
    {
        PermitLimit = permitLimit,
        Window = window,
        SegmentsPerWindow = segmentsPerWindow,
        QueueLimit = 0,
        QueueProcessingOrder = QueueProcessingOrder.OldestFirst,
        AutoReplenishment = true
    };
}

builder.Services.AddRateLimiter(options =>
{
    options.RejectionStatusCode =
        StatusCodes.Status429TooManyRequests;

    options.GlobalLimiter = PartitionedRateLimiter.CreateChained(
        PartitionedRateLimiter.Create<HttpContext, string>(context =>
            RateLimitPartition.GetSlidingWindowLimiter(
                partitionKey:
                    $"global-ip:{context.Connection.RemoteIpAddress?.ToString() ?? "unknown"}",
                factory: _ => SlidingWindow(
                    300,
                    TimeSpan.FromMinutes(1),
                    6))),
        PartitionedRateLimiter.Create<HttpContext, string>(context =>
            RateLimitPartition.GetConcurrencyLimiter(
                partitionKey:
                    $"concurrency-ip:{context.Connection.RemoteIpAddress?.ToString() ?? "unknown"}",
                factory: _ => new ConcurrencyLimiterOptions
                {
                    PermitLimit = 50,
                    QueueLimit = 0,
                    QueueProcessingOrder =
                        QueueProcessingOrder.OldestFirst
                })));

    options.OnRejected = async (rejected, cancellationToken) =>
    {
        var response = rejected.HttpContext.Response;
        response.StatusCode = StatusCodes.Status429TooManyRequests;
        response.ContentType = "application/problem+json; charset=utf-8";

        var retryAfterSeconds = 60;
        if (rejected.Lease.TryGetMetadata(
                MetadataName.RetryAfter,
                out var retryAfter))
        {
            retryAfterSeconds = Math.Max(
                1,
                (int)Math.Ceiling(retryAfter.TotalSeconds));
        }

        response.Headers["Retry-After"] =
            retryAfterSeconds.ToString(CultureInfo.InvariantCulture);

        await JsonSerializer.SerializeAsync(
            response.Body,
            new
            {
                type = "about:blank",
                title = "Thao tác quá nhanh",
                status = StatusCodes.Status429TooManyRequests,
                detail = "Bạn đã thực hiện quá nhiều thao tác. " +
                         $"Vui lòng thử lại sau {retryAfterSeconds} giây.",
                message = "Bạn thao tác quá nhanh. Vui lòng thử lại sau.",
                retryAfterSeconds,
                traceId = rejected.HttpContext.TraceIdentifier
            },
            cancellationToken: cancellationToken);
    };

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
        RateLimitPartition.GetSlidingWindowLimiter(
            partitionKey: $"browse:{ResolveRateLimitActor(context)}",
            factory: _ => SlidingWindow(
                60,
                TimeSpan.FromMinutes(1),
                6)));

    options.AddPolicy("CustomerReservation", context =>
    {
        var ip = context.Connection.RemoteIpAddress?.ToString()
                 ?? "unknown";

        return RateLimitPartition.GetFixedWindowLimiter(
            partitionKey: $"customer-reservation:{ip}",
            factory: _ => new FixedWindowRateLimiterOptions
            {
                PermitLimit = 5,
                Window = TimeSpan.FromMinutes(10),
                QueueLimit = 0,
                QueueProcessingOrder =
                    QueueProcessingOrder.OldestFirst,
                AutoReplenishment = true
            });
    });

    options.AddPolicy("OrderCreate", context =>
        RateLimitPartition.GetSlidingWindowLimiter(
            partitionKey: $"order-create:{ResolveRateLimitActor(context)}",
            factory: _ => SlidingWindow(
                context.User.Identity?.IsAuthenticated == true ? 30 : 6,
                TimeSpan.FromMinutes(1),
                6)));

    options.AddPolicy("OrderItemMutation", context =>
        RateLimitPartition.GetSlidingWindowLimiter(
            partitionKey: $"order-item:{ResolveRateLimitActor(context)}",
            factory: _ => SlidingWindow(
                context.User.Identity?.IsAuthenticated == true ? 60 : 15,
                TimeSpan.FromMinutes(1),
                6)));

    options.AddPolicy("ReservationCreate", context =>
        RateLimitPartition.GetSlidingWindowLimiter(
            partitionKey: $"reservation:{ResolveRateLimitActor(context)}",
            factory: _ => SlidingWindow(
                context.User.Identity?.IsAuthenticated == true ? 30 : 3,
                TimeSpan.FromMinutes(10),
                10)));

    options.AddPolicy("ReservationMutation", context =>
        RateLimitPartition.GetSlidingWindowLimiter(
            partitionKey: $"reservation-mutation:{ResolveRateLimitActor(context)}",
            factory: _ => SlidingWindow(
                context.User.Identity?.IsAuthenticated == true ? 60 : 6,
                TimeSpan.FromMinutes(1),
                6)));

    options.AddPolicy("PaymentMutation", context =>
        RateLimitPartition.GetSlidingWindowLimiter(
            partitionKey: $"payment:{ResolveRateLimitActor(context)}",
            factory: _ => SlidingWindow(
                context.User.Identity?.IsAuthenticated == true ? 20 : 5,
                TimeSpan.FromMinutes(5),
                10)));

    options.AddPolicy("PaymentWebhook", context =>
        RateLimitPartition.GetSlidingWindowLimiter(
            partitionKey:
                $"payment-webhook:{context.Connection.RemoteIpAddress?.ToString() ?? "unknown"}",
            factory: _ => SlidingWindow(
                240,
                TimeSpan.FromMinutes(1),
                6)));

    options.AddPolicy("QrCreate", context =>
    {
        var ip = context.Connection.RemoteIpAddress?.ToString()
                 ?? "unknown";

        var routeResource =
            Convert.ToString(context.Request.RouteValues["token"])
            ?? Convert.ToString(context.Request.RouteValues["orderId"])
            ?? context.Request.Path.Value
            ?? "unknown";

        return RateLimitPartition.GetFixedWindowLimiter(
            partitionKey: $"{ip}:{routeResource}",
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

app.UseCors(frontendCorsPolicy);

app.UseAuthentication();

app.UseRateLimiter();

app.UseAuthorization();

app.UseMiddleware<AtomicRequestMiddleware>();

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

app.Run();

public partial class Program
{
}
