using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Microsoft.Extensions.Logging;
using QuanLyNhaHang.Application.Common.Exceptions;

namespace QuanLyNhaHang.Infrastructure.AI;

public sealed partial class GeminiAiAssistantService
{
    private static readonly object[] SafetySettings =
    [
        new { category = "HARM_CATEGORY_HATE_SPEECH", threshold = "BLOCK_MEDIUM_AND_ABOVE" },
        new { category = "HARM_CATEGORY_HARASSMENT", threshold = "BLOCK_MEDIUM_AND_ABOVE" },
        new { category = "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold = "BLOCK_MEDIUM_AND_ABOVE" },
        new { category = "HARM_CATEGORY_DANGEROUS_CONTENT", threshold = "BLOCK_MEDIUM_AND_ABOVE" }
    ];

    private async Task<JsonDocument> SendGenerateContentAsync(
        string model,
        int maxOutputTokens,
        string instructions,
        IReadOnlyList<JsonElement> contents,
        IReadOnlyList<JsonElement> toolDeclarations,
        IReadOnlyCollection<string> requiredToolNames,
        string providerRequestId,
        CancellationToken cancellationToken)
    {
        using var httpRequest = new HttpRequestMessage(
            HttpMethod.Post,
            BuildGenerateContentUrl(model));
        httpRequest.Headers.Add("x-goog-api-key", _options.ApiKey.Trim());

        var functionCallingConfig = new Dictionary<string, object>
        {
            ["mode"] = requiredToolNames.Count > 0 ? "ANY" : "AUTO"
        };
        if (requiredToolNames.Count > 0)
            functionCallingConfig["allowedFunctionNames"] = requiredToolNames;

        httpRequest.Content = JsonContent.Create(new
        {
            systemInstruction = new
            {
                parts = new[] { new { text = instructions } }
            },
            contents,
            tools = new[]
            {
                new { functionDeclarations = toolDeclarations }
            },
            toolConfig = new
            {
                functionCallingConfig
            },
            safetySettings = SafetySettings,
            generationConfig = new
            {
                maxOutputTokens,
                thinkingConfig = new { thinkingLevel = "low" }
            },
            store = false
        });

        try
        {
            using var response = await _httpClient.SendAsync(
                httpRequest,
                HttpCompletionOption.ResponseHeadersRead,
                cancellationToken);
            var responseJson = await response.Content.ReadAsStringAsync(cancellationToken);

            if (!response.IsSuccessStatusCode)
            {
                var providerMessage = ExtractProviderErrorMessage(responseJson);
                _logger.LogWarning(
                    "Gemini generateContent failed with status {StatusCode}. RequestId={RequestId}. ProviderMessage={ProviderMessage}",
                    (int)response.StatusCode,
                    providerRequestId,
                    providerMessage);

                throw new AiAssistantUnavailableException();
            }

            return JsonDocument.Parse(responseJson);
        }
        catch (AiAssistantUnavailableException)
        {
            throw;
        }
        catch (JsonException exception)
        {
            _logger.LogWarning(
                exception,
                "Gemini returned an invalid JSON response. RequestId={RequestId}",
                providerRequestId);
            throw new AiAssistantUnavailableException(exception);
        }
        catch (HttpRequestException exception)
        {
            _logger.LogWarning(
                exception,
                "Gemini response could not be read. RequestId={RequestId}",
                providerRequestId);
            throw new AiAssistantUnavailableException(exception);
        }
        catch (IOException exception)
        {
            _logger.LogWarning(
                exception,
                "Gemini response stream failed. RequestId={RequestId}",
                providerRequestId);
            throw new AiAssistantUnavailableException(exception);
        }
        catch (TimeoutException exception)
        {
            _logger.LogWarning(
                exception,
                "Gemini response timed out while being read. RequestId={RequestId}",
                providerRequestId);
            throw new AiAssistantUnavailableException(exception);
        }
        catch (OperationCanceledException exception)
            when (!cancellationToken.IsCancellationRequested)
        {
            _logger.LogWarning(
                exception,
                "Gemini HTTP client timeout occurred before the tool conversation timeout. RequestId={RequestId}",
                providerRequestId);
            throw new AiAssistantUnavailableException(exception);
        }
    }

    private static string ExtractProviderErrorMessage(string responseJson)
    {
        try
        {
            using var document = JsonDocument.Parse(responseJson);
            return document.RootElement.TryGetProperty("error", out var error)
                && error.ValueKind == JsonValueKind.Object
                && error.TryGetProperty("message", out var message)
                && message.ValueKind == JsonValueKind.String
                    ? message.GetString()?.Trim() ?? string.Empty
                    : string.Empty;
        }
        catch (JsonException)
        {
            return string.Empty;
        }
    }

    private string BuildGenerateContentUrl(string model)
        => $"{_options.BaseUrl.TrimEnd('/')}/models/{Uri.EscapeDataString(model)}:generateContent";
}
