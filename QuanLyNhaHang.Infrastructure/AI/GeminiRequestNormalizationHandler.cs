using System.Collections.Concurrent;
using System.Net;
using System.Text;
using System.Text.Json;
using System.Text.Json.Nodes;
using Microsoft.Extensions.Logging;

namespace QuanLyNhaHang.Infrastructure.AI;

/// <summary>
/// Normalizes outbound Gemini generateContent requests before they leave the API process.
/// Parameterless function declarations are sent without an empty parameters schema because
/// FunctionDeclaration.parameters is optional when a tool does not accept arguments.
///
/// The handler protects customer/admin chat from both transient provider outages and
/// model-specific free-tier quota exhaustion. Provider 5xx/408 responses are retried with
/// short backoff. HTTP 429 is not retried against the same model because that only consumes
/// more quota; instead the request immediately falls through to another stable Flash-Lite
/// model that supports function calling and has its own model quota. A short circuit breaker
/// keeps later tool rounds away from a model that was just overloaded/rate-limited.
/// </summary>
internal sealed class GeminiRequestNormalizationHandler : DelegatingHandler
{
    private const int MaxTransientAttemptsPerModel = 2;
    private static readonly TimeSpan TransientModelCooldown = TimeSpan.FromMinutes(5);
    private static readonly TimeSpan QuotaModelCooldown = TimeSpan.FromMinutes(15);

    private static readonly ConcurrentDictionary<string, DateTimeOffset>
        UnavailableModels = new(StringComparer.OrdinalIgnoreCase);

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

        var candidates = BuildModelCandidates(template.RequestUri);
        var candidatesToTry = candidates
            .Where(candidate => candidate.Model is null || !IsCoolingDown(candidate.Model))
            .ToList();

        // If every known model is cooling down, probe the last free-tier fallback once so
        // the circuit can recover without making the caller wait for every cooldown to expire.
        if (candidatesToTry.Count == 0 && candidates.Count > 0)
            candidatesToTry.Add(candidates[^1]);

        Exception? lastTransportError = null;
        HttpResponseMessage? lastFallbackResponse = null;

        for (var candidateIndex = 0; candidateIndex < candidatesToTry.Count; candidateIndex++)
        {
            var candidate = candidatesToTry[candidateIndex];
            var modelHadFallbackResponse = false;
            var quotaLimited = false;

            for (var attempt = 1; attempt <= MaxTransientAttemptsPerModel; attempt++)
            {
                using var outboundRequest = template.CreateRequest(candidate.RequestUri);

                try
                {
                    var response = await base.SendAsync(
                        outboundRequest,
                        cancellationToken);

                    if (response.StatusCode == HttpStatusCode.TooManyRequests)
                    {
                        modelHadFallbackResponse = true;
                        quotaLimited = true;
                        lastTransportError = null;
                        lastFallbackResponse?.Dispose();
                        lastFallbackResponse = response;

                        _logger.LogWarning(
                            "Gemini model {Model} hit HTTP 429 quota/rate limit; switching to another free-tier model.",
                            candidate.Model ?? "unknown");

                        // Never retry a 429 against the same model. Free-tier quotas are
                        // model/project scoped and repeating the request only makes it worse.
                        break;
                    }

                    if (!IsTransient(response.StatusCode))
                    {
                        if (candidate.Model is not null)
                            UnavailableModels.TryRemove(candidate.Model, out _);

                        lastFallbackResponse?.Dispose();

                        if (candidateIndex > 0 && candidate.Model is not null)
                        {
                            _logger.LogInformation(
                                "Gemini request recovered by fallback model {Model}.",
                                candidate.Model);
                        }

                        return response;
                    }

                    modelHadFallbackResponse = true;
                    lastTransportError = null;
                    lastFallbackResponse?.Dispose();
                    lastFallbackResponse = response;

                    _logger.LogWarning(
                        "Gemini model {Model} returned transient HTTP {StatusCode} on attempt {Attempt}/{MaxAttempts}.",
                        candidate.Model ?? "unknown",
                        (int)response.StatusCode,
                        attempt,
                        MaxTransientAttemptsPerModel);

                    if (attempt < MaxTransientAttemptsPerModel)
                    {
                        await Task.Delay(
                            GetRetryDelay(attempt),
                            cancellationToken);
                    }
                }
                catch (HttpRequestException exception)
                {
                    lastTransportError = exception;
                    _logger.LogWarning(
                        exception,
                        "Gemini transport request failed for model {Model} on attempt {Attempt}/{MaxAttempts}.",
                        candidate.Model ?? "unknown",
                        attempt,
                        MaxTransientAttemptsPerModel);

                    if (attempt < MaxTransientAttemptsPerModel)
                    {
                        await Task.Delay(
                            GetRetryDelay(attempt),
                            cancellationToken);
                        continue;
                    }

                    break;
                }
                catch (TaskCanceledException exception)
                    when (!cancellationToken.IsCancellationRequested)
                {
                    lastTransportError = exception;
                    _logger.LogWarning(
                        exception,
                        "Gemini request timed out for model {Model} on attempt {Attempt}/{MaxAttempts}.",
                        candidate.Model ?? "unknown",
                        attempt,
                        MaxTransientAttemptsPerModel);

                    if (attempt < MaxTransientAttemptsPerModel)
                    {
                        await Task.Delay(
                            GetRetryDelay(attempt),
                            cancellationToken);
                        continue;
                    }

                    break;
                }
            }

            if (modelHadFallbackResponse && candidate.Model is not null)
            {
                UnavailableModels[candidate.Model] = DateTimeOffset.UtcNow.Add(
                    quotaLimited ? QuotaModelCooldown : TransientModelCooldown);

                if (candidateIndex + 1 < candidatesToTry.Count)
                {
                    _logger.LogWarning(
                        "Gemini model {Model} is unavailable for this request; switching to fallback model {FallbackModel}.",
                        candidate.Model,
                        candidatesToTry[candidateIndex + 1].Model ?? "unknown");
                }
            }

            // A pure network/DNS failure is not model-specific. Trying another model URL
            // would duplicate traffic without fixing the transport problem.
            if (!modelHadFallbackResponse && lastTransportError is not null)
                break;
        }

        if (lastFallbackResponse is not null)
            return lastFallbackResponse;

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

    private static IReadOnlyList<ModelCandidate> BuildModelCandidates(Uri? requestUri)
    {
        if (requestUri is null || !TryGetModelName(requestUri, out var model))
            return [new ModelCandidate(null, requestUri)];

        var models = new List<string> { model };

        // Flash-Lite is the right safety net for this restaurant assistant: Google exposes
        // a Free Tier for these stable models and both support function calling.
        if (!model.Equals("gemini-3.5-flash-lite", StringComparison.OrdinalIgnoreCase))
            models.Add("gemini-3.5-flash-lite");

        if (!model.Equals("gemini-3.1-flash-lite", StringComparison.OrdinalIgnoreCase))
            models.Add("gemini-3.1-flash-lite");

        return models
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .Select(candidateModel => new ModelCandidate(
                candidateModel,
                ReplaceModel(requestUri, candidateModel)))
            .ToList();
    }

    private static bool TryGetModelName(Uri requestUri, out string model)
    {
        const string marker = "/models/";
        var path = requestUri.AbsolutePath;
        var markerIndex = path.IndexOf(marker, StringComparison.OrdinalIgnoreCase);
        if (markerIndex < 0)
        {
            model = string.Empty;
            return false;
        }

        var modelStart = markerIndex + marker.Length;
        var modelEnd = path.IndexOf(':', modelStart);
        if (modelEnd <= modelStart)
        {
            model = string.Empty;
            return false;
        }

        model = Uri.UnescapeDataString(path[modelStart..modelEnd]);
        return !string.IsNullOrWhiteSpace(model);
    }

    private static Uri ReplaceModel(Uri requestUri, string model)
    {
        const string marker = "/models/";
        var path = requestUri.AbsolutePath;
        var markerIndex = path.IndexOf(marker, StringComparison.OrdinalIgnoreCase);
        if (markerIndex < 0)
            return requestUri;

        var modelStart = markerIndex + marker.Length;
        var modelEnd = path.IndexOf(':', modelStart);
        if (modelEnd <= modelStart)
            return requestUri;

        var builder = new UriBuilder(requestUri)
        {
            Path = string.Concat(
                path.AsSpan(0, modelStart),
                model,
                path.AsSpan(modelEnd))
        };

        return builder.Uri;
    }

    private static bool IsCoolingDown(string model)
    {
        if (!UnavailableModels.TryGetValue(model, out var unavailableUntil))
            return false;

        if (unavailableUntil > DateTimeOffset.UtcNow)
            return true;

        UnavailableModels.TryRemove(model, out _);
        return false;
    }

    private static bool IsTransient(HttpStatusCode statusCode)
    {
        var numeric = (int)statusCode;
        return statusCode == HttpStatusCode.RequestTimeout
            || numeric is 500 or 502 or 503 or 504;
    }

    private static TimeSpan GetRetryDelay(int attempt)
    {
        var baseMilliseconds = attempt switch
        {
            1 => 1_000,
            _ => 2_000
        };

        return TimeSpan.FromMilliseconds(
            baseMilliseconds + Random.Shared.Next(100, 400));
    }

    private sealed record ModelCandidate(string? Model, Uri? RequestUri);

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

        public Uri? RequestUri => _requestUri;

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
                request.RequestPolicy,
                headers,
                contentHeaders,
                normalizedContent);
        }

        public HttpRequestMessage CreateRequest(Uri? requestUri = null)
        {
            var request = new HttpRequestMessage(
                _method,
                requestUri ?? _requestUri)
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
