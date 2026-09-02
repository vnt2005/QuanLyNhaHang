using System.Net;
using System.Net.Http.Json;
using System.Text.Json;
using Microsoft.Extensions.Logging;

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

                if (response.StatusCode == HttpStatusCode.TooManyRequests)
                {
                    throw new InvalidOperationException(
                        "Gemini đã chạm hạn mức hiện tại. Vui lòng thử lại sau hoặc kiểm tra quota Google AI Studio.");
                }

                if (response.StatusCode is HttpStatusCode.Unauthorized or HttpStatusCode.Forbidden)
                {
                    throw new InvalidOperationException(
                        "Google AI Studio API key không hợp lệ hoặc không có quyền gọi Gemini API.");
                }

                if (response.StatusCode == HttpStatusCode.NotFound)
                {
                    throw new InvalidOperationException(
                        $"Không tìm thấy model Gemini '{model}'. Hãy kiểm tra model trong cấu hình AI.");
                }

                if (response.StatusCode == HttpStatusCode.BadRequest)
                {
                    throw new InvalidOperationException(
                        string.IsNullOrWhiteSpace(providerMessage)
                            ? "Gemini từ chối cấu hình yêu cầu. Hãy kiểm tra model và cấu hình AI."
                            : $"Gemini từ chối yêu cầu: {providerMessage}");
                }

                throw new InvalidOperationException(
                    "Dịch vụ Gemini hiện chưa phản hồi được. Vui lòng thử lại sau.");
            }

            return JsonDocument.Parse(responseJson);
        }
        catch (JsonException exception)
        {
            _logger.LogWarning(
                exception,
                "Gemini returned an invalid JSON response. RequestId={RequestId}",
                providerRequestId);
            throw new InvalidOperationException(
                "Dịch vụ Gemini trả về dữ liệu không hợp lệ. Vui lòng thử lại sau.",
                exception);
        }
        catch (HttpRequestException exception)
        {
            _logger.LogWarning(
                exception,
                "Gemini response could not be read. RequestId={RequestId}",
                providerRequestId);
            throw new InvalidOperationException(
                "Không đọc được phản hồi từ dịch vụ Gemini. Vui lòng kiểm tra kết nối máy chủ rồi thử lại.",
                exception);
        }
        catch (IOException exception)
        {
            _logger.LogWarning(
                exception,
                "Gemini response stream failed. RequestId={RequestId}",
                providerRequestId);
            throw new InvalidOperationException(
                "Kết nối tới dịch vụ Gemini bị gián đoạn. Vui lòng thử lại sau.",
                exception);
        }
        catch (TimeoutException exception)
        {
            _logger.LogWarning(
                exception,
                "Gemini response timed out while being read. RequestId={RequestId}",
                providerRequestId);
            throw new InvalidOperationException(
                "Dịch vụ Gemini phản hồi quá lâu. Vui lòng thử lại sau.",
                exception);
        }
        catch (OperationCanceledException exception)
            when (!cancellationToken.IsCancellationRequested)
        {
            _logger.LogWarning(
                exception,
                "Gemini HTTP client timeout occurred before the tool conversation timeout. RequestId={RequestId}",
                providerRequestId);
            throw new InvalidOperationException(
                "Dịch vụ Gemini không phản hồi trong thời gian cho phép.",
                exception);
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
