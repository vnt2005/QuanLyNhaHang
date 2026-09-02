namespace QuanLyNhaHang.Api.Configuration;

public static class RateLimitingExtensions
{
    public static IServiceCollection AddApiRateLimiting(
        this IServiceCollection services)
    {
        services.AddRateLimiter(options =>
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

            options.OnRejected = WriteRejectedResponseAsync;

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
                    partitionKey:
                        $"browse:{ResolveRateLimitActor(context)}",
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
                    partitionKey:
                        $"order-create:{ResolveRateLimitActor(context)}",
                    factory: _ => SlidingWindow(
                        context.User.Identity?.IsAuthenticated == true
                            ? 30
                            : 6,
                        TimeSpan.FromMinutes(1),
                        6)));

            options.AddPolicy("OrderItemMutation", context =>
                RateLimitPartition.GetSlidingWindowLimiter(
                    partitionKey:
                        $"order-item:{ResolveRateLimitActor(context)}",
                    factory: _ => SlidingWindow(
                        context.User.Identity?.IsAuthenticated == true
                            ? 60
                            : 15,
                        TimeSpan.FromMinutes(1),
                        6)));

            options.AddPolicy("ReservationCreate", context =>
                RateLimitPartition.GetSlidingWindowLimiter(
                    partitionKey:
                        $"reservation:{ResolveRateLimitActor(context)}",
                    factory: _ => SlidingWindow(
                        context.User.Identity?.IsAuthenticated == true
                            ? 30
                            : 3,
                        TimeSpan.FromMinutes(10),
                        10)));

            options.AddPolicy("ReservationMutation", context =>
                RateLimitPartition.GetSlidingWindowLimiter(
                    partitionKey:
                        $"reservation-mutation:{ResolveRateLimitActor(context)}",
                    factory: _ => SlidingWindow(
                        context.User.Identity?.IsAuthenticated == true
                            ? 60
                            : 6,
                        TimeSpan.FromMinutes(1),
                        6)));

            options.AddPolicy("PaymentMutation", context =>
                RateLimitPartition.GetSlidingWindowLimiter(
                    partitionKey:
                        $"payment:{ResolveRateLimitActor(context)}",
                    factory: _ => SlidingWindow(
                        context.User.Identity?.IsAuthenticated == true
                            ? 20
                            : 5,
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
                    ?? Convert.ToString(
                        context.Request.RouteValues["orderId"])
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

        return services;
    }

    private static string ResolveRateLimitActor(HttpContext context)
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

    private static SlidingWindowRateLimiterOptions SlidingWindow(
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

    private static async ValueTask WriteRejectedResponseAsync(
        OnRejectedContext rejected,
        CancellationToken cancellationToken)
    {
        var response = rejected.HttpContext.Response;
        response.StatusCode = StatusCodes.Status429TooManyRequests;
        response.ContentType =
            "application/problem+json; charset=utf-8";

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
                message =
                    $"Bạn thao tác quá nhanh. Vui lòng thử lại sau {retryAfterSeconds} giây.",
                retryAfterSeconds
            },
            cancellationToken: cancellationToken);
    }
}
