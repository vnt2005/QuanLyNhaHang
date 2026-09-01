using System.Net;
using System.Text;
using System.Text.Json;
using System.Text.Json.Nodes;
using Microsoft.Extensions.Logging;

namespace QuanLyNhaHang.Infrastructure.AI;

/// <summary>
/// Normalizes outbound Gemini generateContent requests before they leave the API process.
/// Gemini rejects (and on some model versions may surface as 5xx for) parameterless
/// function declarations that are sent as { type: object, properties: {} }.
/// The API contract allows FunctionDeclaration.parameters to be omitted entirely when
/// a function does not accept arguments, so we remove only those empty schemas.
///
/// The handler also retries transient Gemini 5xx/408 responses a small number of times.
/// It never retries 4xx validation/auth/quota responses because those require an explicit
/// configuration fix instead of more provider traffic.
/// </summary>
internal sealed class GeminiRequestNormalizationHandler : DelegatingHandler
{
    private const int MaxAttempts = 3;

    private readonly ILogger<GeminiRequestNormalizationHandler> _logger;

    public GeminiRequestNormalizationHandler(
        ILogger<GeminiRequestNormalizationHandler> logger)
    {
        _logger = logger;
    }

    protected override async Task<HttpResponseMessage> SendAsync(
        HttpRequestMessage request,
        CancellationToken cancellationToken)
    {
        var template = await GeminiRequestTemplate.CreateAsync(
            request,
            cancellationToken);

        Exception? lastTransportError = null;

        for (var attempt = 1; attempt <= MaxAttempts; attempt++)
        {
            using var outboundRequest = template.CreateRequest();

            try
            {
                var response = await base.SendAsync(
                    outboundRequest,
                    cancellationToken);

                if (!IsTransient(response.StatusCode))
                    return response;

                if (attempt == MaxAttempts)
                {
                    var statusCode = (int)response.StatusCode;
                    response.Dispose();
                    throw new InvalidOperationException(
                        $"Gemini API đang lỗi tạm thời (HTTP {statusCode}) sau {MaxAttempts} lần thử. "
                        + "Vui lòng thử lại sau ít phút.");
                }

                _logger.LogWarning(
                    "Gemini returned transient HTTP {StatusCode}; retrying attempt {NextAttempt}/{MaxAttempts}.",
                    (int)response.StatusCode,
                    attempt + 1,
                    MaxAttempts);

                response.Dispose();
                await Task.Delay(GetRetryDelay(attempt), cancellationToken);
            }
            catch (HttpRequestException exception) when (attempt < MaxAttempts)
            {
                lastTransportError = exception;
                _logger.LogWarning(
                    exception,
                    "Gemini transport request failed; retrying attempt {NextAttempt}/{MaxAttempts}.",
                    attempt + 1,
                    MaxAttempts);
                await Task.Delay(GetRetryDelay(attempt), cancellationToken);
            }
            catch (TaskCanceledException exception)
                when (!cancellationToken.IsCancellationRequested && attempt < MaxAttempts)
            {
                lastTransportError = exception;
                _logger.LogWarning(
                    exception,
                    "Gemini request timed out; retrying attempt {NextAttempt}/{MaxAttempts}.",
                    attempt + 1,
                    MaxAttempts);
                await Task.Delay(GetRetryDelay(attempt), cancellationToken);
            }
            catch (HttpRequestException exception)
            {
                lastTransportError = exception;
                break;
            }
            catch (TaskCanceledException exception)
                when (!cancellationToken.IsCancellationRequested)
            {
                lastTransportError = exception;
                break;
            }
        }

        throw new InvalidOperationException(
            "Máy chủ nhà hàng không kết nối ổn định được tới Gemini API sau nhiều lần thử. "
            + "Hãy kiểm tra kết nối Internet/DNS của container API rồi thử lại.",
            lastTransportError);
    }

    internal static string NormalizeGenerateContentJson(string json)
    {
        if (string.IsNullOrWhiteSpace(json))
            return json;

        JsonNode? root;
        try
        {
            root = JsonNode.Parse(json);
        }
        catch (JsonException)
        {
            return json;
        }

        if (root is not JsonObject rootObject
            || rootObject["tools"] is not JsonArray tools)
        {
            return json;
        }

        var changed = false;
        foreach (var toolNode in tools)
        {
            if (toolNode is not JsonObject tool
                || tool["functionDeclarations"] is not JsonArray declarations)
            {
                continue;
            }

            foreach (var declarationNode in declarations)
            {
                if (declarationNode is not JsonObject declaration
                    || declaration["parameters"] is not JsonObject parameters)
                {
                    continue;
                }

                if (parameters["properties"] is JsonObject properties
                    && properties.Count == 0)
                {
                    // FunctionDeclaration.parameters is optional in Gemini API.
                    // Omitting it is the correct representation for a no-argument tool.
                    declaration.Remove("parameters");
                    changed = true;
                }
            }
        }

        return changed
            ? rootObject.ToJsonString(new JsonSerializerOptions
            {
                PropertyNamingPolicy = null,
                WriteIndented = false
            })
            : json;
    }

    private static bool IsTransient(HttpStatusCode statusCode)
    {
        var numeric = (int)statusCode;
        return statusCode == HttpStatusCode.RequestTimeout
            || numeric is 500 or 502 or 503 or 504;
    }

    private static TimeSpan GetRetryDelay(int attempt)
    {
        return attempt switch
        {
            1 => TimeSpan.FromMilliseconds(350),
            _ => TimeSpan.FromMilliseconds(900)
        };
    }

    private sealed class GeminiRequestTemplate
    {
        private readonly HttpMethod _method;
        private readonly Uri? _requestUri;
        private readonly Version _version;
        private readonly HttpVersionPolicy _versionPolicy;
        private readonly IReadOnlyList<KeyValuePair<string, IEnumerable<string>>> _headers;
        private readonly IReadOnlyList<KeyValuePair<string, IEnumerable<string>>> _contentHeaders;
        private readonly string? _content;

        private GeminiRequestTemplate(
            HttpMethod method,
            Uri? requestUri,
            Version version,
            HttpVersionPolicy versionPolicy,
            IReadOnlyList<KeyValuePair<string, IEnumerable<string>>> headers,
            IReadOnlyList<KeyValuePair<string, IEnumerable<string>>> contentHeaders,
            string? content)
        {
            _method = method;
            _requestUri = requestUri;
            _version = version;
            _versionPolicy = versionPolicy;
            _headers = headers;
            _contentHeaders = contentHeaders;
            _content = content;
        }

        public static async Task<GeminiRequestTemplate> CreateAsync(
            HttpRequestMessage request,
            CancellationToken cancellationToken)
        {
            var headers = request.Headers
                .Select(header => new KeyValuePair<string, IEnumerable<string>>(
                    header.Key,
                    header.Value.ToArray()))
                .ToArray();

            if (request.Content is null)
            {
                return new GeminiRequestTemplate(
                    request.Method,
                    request.RequestUri,
                    request.Version,
                    request.VersionPolicy,
                    headers,
                    [],
                    null);
            }

            var rawContent = await request.Content.ReadAsStringAsync(cancellationToken);
            var normalizedContent = NormalizeGenerateContentJson(rawContent);
            var contentHeaders = request.Content.Headers
                .Select(header => new KeyValuePair<string, IEnumerable<string>>(
                    header.Key,
                    header.Value.ToArray()))
                .ToArray();

            return new GeminiRequestTemplate(
                request.Method,
                request.RequestUri,
                request.Version,
                request.VersionPolicy,
                headers,
                contentHeaders,
                normalizedContent);
        }

        public HttpRequestMessage CreateRequest()
        {
            var request = new HttpRequestMessage(_method, _requestUri)
            {
                Version = _version,
                VersionPolicy = _versionPolicy
            };

            foreach (var header in _headers)
            {
                request.Headers.TryAddWithoutValidation(header.Key, header.Value);
            }

            if (_content is null)
                return request;

            request.Content = new StringContent(
                _content,
                Encoding.UTF8,
                "application/json");

            foreach (var header in _contentHeaders)
            {
                if (string.Equals(
                    header.Key,
                    "Content-Type",
                    StringComparison.OrdinalIgnoreCase)
                    || string.Equals(
                        header.Key,
                        "Content-Length",
                        StringComparison.OrdinalIgnoreCase))
                {
                    continue;
                }

                request.Content.Headers.TryAddWithoutValidation(
                    header.Key,
                    header.Value);
            }

            return request;
        }
    }
}
