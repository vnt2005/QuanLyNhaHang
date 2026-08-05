using System.Text.Json;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Logging.Abstractions;
using QuanLyNhaHang.Api.Middlewares;
using Xunit;

namespace QuanLyNhaHang.IntegrationTests.Middleware;

public sealed class ExceptionHandlingMiddlewareTests
{
    [Fact]
    public async Task UnknownException_ReturnsGeneric500WithTraceId()
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
            traceId,
            root.GetProperty("traceId").GetString());
        Assert.DoesNotContain(
            internalMessage,
            root.GetProperty("detail").GetString());
    }

    [Fact]
    public async Task ExpectedException_ReturnsClientSafe400Details()
    {
        const string message = "Số lượng món phải lớn hơn 0.";

        var middleware = new ExceptionHandlingMiddleware(
            _ => throw new ArgumentException(message),
            NullLogger<ExceptionHandlingMiddleware>.Instance);
        var context = CreateContext("validation-trace");

        await middleware.InvokeAsync(context);

        Assert.Equal(
            StatusCodes.Status400BadRequest,
            context.Response.StatusCode);

        using var document = await ReadResponseAsync(context);
        var root = document.RootElement;

        Assert.Equal(
            message,
            root.GetProperty("detail").GetString());
        Assert.Equal(
            "validation-trace",
            root.GetProperty("traceId").GetString());
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
