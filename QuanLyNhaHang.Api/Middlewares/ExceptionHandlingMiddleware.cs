using System.Net;
using System.Text.Json;
using Microsoft.EntityFrameworkCore;
using QuanLyNhaHang.Application.Common.Exceptions;

namespace QuanLyNhaHang.Api.Middlewares;

public class ExceptionHandlingMiddleware
{
    private static readonly JsonSerializerOptions JsonOptions =
        new(JsonSerializerDefaults.Web);

    private readonly RequestDelegate _next;
    private readonly ILogger<ExceptionHandlingMiddleware> _logger;

    public ExceptionHandlingMiddleware(
        RequestDelegate next,
        ILogger<ExceptionHandlingMiddleware> logger)
    {
        _next = next;
        _logger = logger;
    }

    public async Task InvokeAsync(HttpContext context)
    {
        try
        {
            await _next(context);
        }
        catch (OperationCanceledException)
            when (context.RequestAborted.IsCancellationRequested)
        {
            _logger.LogDebug(
                "Request {TraceId} đã bị phía khách hàng hủy.",
                context.TraceIdentifier);
        }
        catch (Exception exception)
        {
            if (context.Response.HasStarted)
            {
                _logger.LogError(
                    exception,
                    "Không thể ghi phản hồi lỗi vì response đã bắt đầu. " +
                    "TraceId: {TraceId}",
                    context.TraceIdentifier);
                throw;
            }

            var error = MapException(exception);

            if (error.StatusCode >= StatusCodes.Status500InternalServerError)
            {
                _logger.LogError(
                    exception,
                    "Lỗi nội bộ khi xử lý request. TraceId: {TraceId}",
                    context.TraceIdentifier);
            }
            else
            {
                _logger.LogWarning(
                    exception,
                    "Request bị từ chối với HTTP {StatusCode}. " +
                    "TraceId: {TraceId}",
                    error.StatusCode,
                    context.TraceIdentifier);
            }

            await WriteErrorResponseAsync(context, error);
        }
    }

    private static ErrorDescriptor MapException(Exception exception)
    {
        return exception switch
        {
            AiAssistantUnavailableException => new ErrorDescriptor(
                (int)HttpStatusCode.ServiceUnavailable,
                "Trợ lý AI tạm thời không khả dụng",
                AiAssistantUnavailableException.PublicMessage),
            EmailDeliveryException => new ErrorDescriptor(
                (int)HttpStatusCode.ServiceUnavailable,
                "Dịch vụ email tạm thời không khả dụng",
                exception.Message),
            ArgumentException => new ErrorDescriptor(
                (int)HttpStatusCode.BadRequest,
                "Yêu cầu không hợp lệ",
                exception.Message),
            InvalidOperationException => new ErrorDescriptor(
                (int)HttpStatusCode.BadRequest,
                "Không thể thực hiện thao tác",
                exception.Message),
            KeyNotFoundException => new ErrorDescriptor(
                (int)HttpStatusCode.NotFound,
                "Không tìm thấy dữ liệu",
                exception.Message),
            UnauthorizedAccessException => new ErrorDescriptor(
                (int)HttpStatusCode.Unauthorized,
                "Chưa được phép truy cập",
                exception.Message),
            DbUpdateConcurrencyException => new ErrorDescriptor(
                (int)HttpStatusCode.Conflict,
                "Dữ liệu vừa được cập nhật",
                "Dữ liệu đã thay đổi bởi một thao tác khác. " +
                "Vui lòng tải lại trạng thái mới nhất rồi thử lại."),
            DbUpdateException => new ErrorDescriptor(
                (int)HttpStatusCode.Conflict,
                "Xung đột dữ liệu",
                "Thao tác xung đột với ràng buộc dữ liệu hiện tại. " +
                "Vui lòng tải lại và kiểm tra trước khi thử lại."),
            _ => new ErrorDescriptor(
                (int)HttpStatusCode.InternalServerError,
                "Đã xảy ra lỗi",
                "Hệ thống đang gặp sự cố. Vui lòng thử lại sau.")
        };
    }

    private static async Task WriteErrorResponseAsync(
        HttpContext context,
        ErrorDescriptor error)
    {
        context.Response.Clear();
        context.Response.StatusCode = error.StatusCode;
        context.Response.ContentType =
            "application/problem+json; charset=utf-8";

        // Diagnostic identifiers and exception internals are deliberately kept
        // in server logs only. Client applications receive only user-safe data.
        var response = new
        {
            type = "about:blank",
            title = error.Title,
            status = error.StatusCode,
            message = error.Detail
        };

        await JsonSerializer.SerializeAsync(
            context.Response.Body,
            response,
            JsonOptions,
            context.RequestAborted);
    }

    private sealed record ErrorDescriptor(
        int StatusCode,
        string Title,
        string Detail);
}
