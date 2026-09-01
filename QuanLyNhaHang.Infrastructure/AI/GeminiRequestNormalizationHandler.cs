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
/// The handler also protects the customer/admin chat from transient Gemini capacity outages.
/// It retries retryable responses with exponential backoff and, when Gemini 3.7 Flash stays
/// unavailable, automatically falls back to the stable 3.6/3.5 Flash models. A short circuit
/// breaker keeps later tool rounds on the working fallback instead of repeatedly hitting a
/// model that is already known to be unavailable.
/// </summary>
internal sealed class GeminiRequestNormalizationHandler : DelegatingHandler
{
    private const int MaxAttemptsPerModel = 2;
    private static readonly TimeSpan ModelCooldown = TimeSpan.FromMinutes(5);

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

        // If every known model is cooling down, still probe the last fallback instead of
        // failing locally without contacting Gemini. This also lets the circuit recover early.
        if (candidatesToTry.Count == 0 && candidates.Count > 0)
            candidatesToTry.Add(candidates[^1]);

        Exception? lastTransportError = null;
        HttpResponseMessage? lastTransientResponse = null;

        for (var candidateIndex = 0; candidateIndex < candidatesToTry.Count; candidateIndex++)
        {
            var candidate = candidatesToTry[candidateIndex];
            var modelHadTransientResponse = false;

            for (var attempt = 1; attempt <= MaxAttemptsPerModel; attempt++)
            {
                using var outboundRequest = template.CreateRequest(candidate.RequestUri);

                try
                {
                    var response = await base.SendAsync(
                        outboundRequest,
                        cancellationToken);

                    if (!IsTransient(response.StatusCode))
                    {
                        if (candidate.Model is not null)
                            UnavailableModels.TryRemove(candidate.Model, out _);

                        lastTransientResponse?.Dispose();

                        if (candidateIndex > 0 && candidate.Model is not null)
                        {
                            _logger.LogInformation(
                                "Gemini request recovered by fallback model {Model}.",
                                candidate.Model);
                        }

                        return response;
                    }

                    modelHadTransientResponse = true;
                    lastTransportError = null;
                    lastTransientResponse?.Dispose();
                    lastTransientResponse = response;

                    _logger.LogWarning(
                        "Gemini model {Model} returned transient HTTP {StatusCode} on attempt {Attempt}/{MaxAttempts}.",
                        candidate.Model ?? "unknown",
                        (int)response.StatusCode,
                        attempt,
                        MaxAttemptsPerModel);

                    if (attempt < MaxAttemptsPerModel)
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
                        MaxAttemptsPerModel);

                    if (attempt < MaxAttemptsPerModel)
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
                        MaxAttemptsPerModel);

                    if (attempt < MaxAttemptsPerModel)
                    {
                        await Task.Delay(
                            GetRetryDelay(attempt),
                            cancellationToken);
                        continue;
                    }

                    break;
                }
            }

            if (modelHadTransientResponse && candidate.Model is not null)
            {
                UnavailableModels[candidate.Model] = DateTimeOffset.UtcNow.Add(ModelCooldown);

                if (candidateIndex + 1 < candidatesToTry.Count)
                {
                    _logger.LogWarning(
                        "Gemini model {Model} is temporarily unavailable; switching to fallback model {FallbackModel}.",
                        candidate.Model,
                        candidatesToTry[candidateIndex + 1].Model ?? "unknown");
                }
            }

            // A pure network/DNS failure is not model-specific, so trying another model URL
            // would only duplicate traffic. Provider 5xx/408 responses, however, are eligible
            // for model fallback.
            if (!modelHadTransientResponse && lastTransportError is not null)
                break;
        }

        if (lastTransientResponse is not null)
            return lastTransientResponse;

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

        if (model.Equals("gemini-3.7-flash", StringComparison.OrdinalIgnoreCase)
            || model.Equals("gemini-flash-latest", StringComparison.OrdinalIgnoreCase))
        {
            models.Add("gemini-3.6-flash");
            models.Add("gemini-3.5-flash");
        }
        else if (model.Equals("gemini-3.6-flash", StringComparison.OrdinalIgnoreCase))
        {
            models.Add("gemini-3.5-flash");
        }

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
                request.VersionPolicy,
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
