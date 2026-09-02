using System.Text.Json;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Logging.Abstractions;
using QuanLyNhaHang.Api.Middlewares;
using Xunit;

namespace QuanLyNhaHang.IntegrationTests.Middleware;

public sealed class ExceptionHandlingMiddlewareTests
{
    [Fact]
    public async Task UnknownException_ReturnsGeneric500WithoutDiagnostics()
    {
        const string internalMessage =
            "Thông tin nội bộ không được gửi về client";
        const string traceId = "dependability-test-trace";

        var middleware = new ExceptionHandlingMiddleware(
            _ => throw new Exception(internalMessage),
            NullLogger<ExceptionHandlingMiddleware>.Instance);
        var context = CreateContext(traceId);

        await middleware.InvokeAsync(context);

        Assert.Equal(
            StatusCodes.Status500InternalServerError,
            context.Response.StatusCode);
        Assert.Equal(
            "application/problem+json",
            context.Response.ContentType?.Split(';')[0]);

        using var document = await ReadResponseAsync(context);
        var root = document.RootElement;

        Assert.Equal(
            StatusCodes.Status500InternalServerError,
            root.GetProperty("status").GetInt32());
        Assert.Equal(
            "Hệ thống đang gặp sự cố. Vui lòng thử lại sau.",
            root.GetProperty("message").GetString());
        Assert.False(root.TryGetProperty("traceId", out _));
        Assert.False(root.TryGetProperty("detail", out _));
        Assert.DoesNotContain(internalMessage, root.GetRawText());
        Assert.DoesNotContain(traceId, root.GetRawText());
    }

    [Fact]
    public async Task ExpectedException_ReturnsOnlyClientSafeDetails()
    {
        const string message = "Số lượng món phải lớn hơn 0.";
        const string traceId = "validation-trace";

        var middleware = new ExceptionHandlingMiddleware(
            _ => throw new ArgumentException(message),
            NullLogger<ExceptionHandlingMiddleware>.Instance);
        var context = CreateContext(traceId);

        await middleware.InvokeAsync(context);

        Assert.Equal(
            StatusCodes.Status400BadRequest,
            context.Response.StatusCode);

        using var document = await ReadResponseAsync(context);
        var root = document.RootElement;

        Assert.Equal(message, root.GetProperty("message").GetString());
        Assert.False(root.TryGetProperty("traceId", out _));
        Assert.False(root.TryGetProperty("detail", out _));
        Assert.DoesNotContain(traceId, root.GetRawText());
    }

    private static DefaultHttpContext CreateContext(string traceId)
    {
        var context = new DefaultHttpContext
        {
            TraceIdentifier = traceId
        };
        context.Response.Body = new MemoryStream();

        return context;
    }

    private static async Task<JsonDocument> ReadResponseAsync(
        HttpContext context)
    {
        context.Response.Body.Position = 0;
        return await JsonDocument.ParseAsync(context.Response.Body);
    }
}
