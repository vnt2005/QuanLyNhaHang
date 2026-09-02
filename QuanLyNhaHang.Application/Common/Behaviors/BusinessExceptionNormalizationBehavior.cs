using MediatR;

namespace QuanLyNhaHang.Application.Common.Behaviors;

/// <summary>
/// Converts legacy, explicitly thrown System.Exception instances from use-case
/// handlers into the typed exceptions understood by the API error middleware.
/// Typed exceptions are never changed.
/// </summary>
public sealed class BusinessExceptionNormalizationBehavior<TRequest, TResponse>
    : IPipelineBehavior<TRequest, TResponse>
    where TRequest : notnull
{
    public async Task<TResponse> Handle(
        TRequest request,
        RequestHandlerDelegate<TResponse> next,
        CancellationToken cancellationToken)
    {
        try
        {
            return await next(cancellationToken);
        }
        catch (Exception exception) when (exception.GetType() == typeof(Exception))
        {
            if (LooksLikeNotFound(exception.Message))
                throw new KeyNotFoundException(exception.Message, exception);

            throw new InvalidOperationException(exception.Message, exception);
        }
    }

    private static bool LooksLikeNotFound(string message)
    {
        return message.Contains("không tìm thấy", StringComparison.OrdinalIgnoreCase)
            || message.Contains("không tồn tại", StringComparison.OrdinalIgnoreCase);
    }
}
