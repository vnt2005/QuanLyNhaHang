using System.Globalization;
using System.Text.Json;
using QuanLyNhaHang.Application.Common.Orders;

namespace QuanLyNhaHang.Api.Middlewares;

public sealed class AnonymousOrderAbuseMiddleware
{
    private static readonly JsonSerializerOptions JsonOptions =
        new(JsonSerializerDefaults.Web);

    private readonly RequestDelegate _next;

    public AnonymousOrderAbuseMiddleware(RequestDelegate next)
    {
        _next = next;
    }

    public async Task InvokeAsync(
        HttpContext context,
        AnonymousOrderAbuseGuard abuseGuard)
    {
        if (!IsAnonymousOrderCreation(context))
        {
            await _next(context);
            return;
        }

        var decision = abuseGuard.RegisterAttempt(
            context.Connection.RemoteIpAddress?.ToString(),
            context.Request.Headers[AtomicRequestMiddleware.ClientIdHeaderName].ToString(),
            context.Request.Headers[AtomicRequestMiddleware.IdempotencyHeaderName].ToString());

        if (!decision.IsBlocked)
        {
            await _next(context);
            return;
        }

        var retryAfterSeconds = Math.Max(
            1,
            (int)Math.Ceiling(decision.RetryAfter.TotalSeconds));

        context.Response.StatusCode = StatusCodes.Status429TooManyRequests;
        context.Response.ContentType = "application/problem+json; charset=utf-8";
        context.Response.Headers.RetryAfter =
            retryAfterSeconds.ToString(CultureInfo.InvariantCulture);

        await JsonSerializer.SerializeAsync(
            context.Response.Body,
            new
            {
                type = "about:blank",
                title = "Thiết bị tạm thời bị chặn đặt món",
                status = StatusCodes.Status429TooManyRequests,
                message =
                    "Hệ thống phát hiện thiết bị hoặc địa chỉ mạng gửi quá nhiều yêu cầu đặt món khi chưa đăng nhập. " +
                    "Thiết bị và IP hiện tại bị tạm khóa đặt món trong khoảng 30 phút.",
                retryAfterSeconds
            },
            JsonOptions,
            context.RequestAborted);
    }

    private static bool IsAnonymousOrderCreation(HttpContext context)
    {
        if (!HttpMethods.IsPost(context.Request.Method) ||
            context.User.Identity?.IsAuthenticated == true)
        {
            return false;
        }

        var path = context.Request.Path.Value ?? string.Empty;
        if (path.Equals(
                "/api/customer-site/takeaway-orders",
                StringComparison.OrdinalIgnoreCase))
        {
            return true;
        }

        if (!path.StartsWith(
                "/api/qr-order/",
                StringComparison.OrdinalIgnoreCase))
        {
            return false;
        }

        var segments = path.Split(
            '/',
            StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);

        return segments.Length == 4 &&
               segments[0].Equals("api", StringComparison.OrdinalIgnoreCase) &&
               segments[1].Equals("qr-order", StringComparison.OrdinalIgnoreCase) &&
               segments[3].Equals("orders", StringComparison.OrdinalIgnoreCase);
    }
}
