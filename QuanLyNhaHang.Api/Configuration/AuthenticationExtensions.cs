namespace QuanLyNhaHang.Api.Configuration;

public static class AuthenticationExtensions
{
    public static IServiceCollection AddApiAuthentication(
        this IServiceCollection services,
        IConfiguration configuration)
    {
        services
            .AddAuthentication(options =>
            {
                options.DefaultAuthenticateScheme =
                    JwtBearerDefaults.AuthenticationScheme;
                options.DefaultChallengeScheme =
                    JwtBearerDefaults.AuthenticationScheme;
            })
            .AddJwtBearer(options =>
            {
                var secretKey = configuration["Jwt:SecretKey"];

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
                    ValidIssuer = configuration["Jwt:Issuer"],
                    ValidAudience = configuration["Jwt:Audience"],
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
                            path.StartsWithSegments(
                                "/hubs/admin-notifications"))
                        {
                            context.Token = accessToken;
                        }

                        return Task.CompletedTask;
                    },
                    OnTokenValidated = ValidateTokenAsync
                };
            });

        return services;
    }

    private static async Task ValidateTokenAsync(TokenValidatedContext context)
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
        var authSessionService =
            services.GetRequiredService<IAuthSessionService>();

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
}
