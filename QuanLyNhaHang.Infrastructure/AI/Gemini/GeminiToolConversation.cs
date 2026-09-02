using System.Text;
using System.Text.Json;
using Microsoft.Extensions.Logging;
using QuanLyNhaHang.Application.Features.AiAssistant;
using QuanLyNhaHang.Application.Features.AiAssistant.DTOs;

namespace QuanLyNhaHang.Infrastructure.AI;

public sealed partial class GeminiAiAssistantService
{
    private const int MaxToolRounds = 4;

    private async Task<AiAssistantChatResponseDto> RunToolConversationAsync(
        AiAssistantChatRequestDto request,
        string model,
        int maxOutputTokens,
        string instructions,
        IReadOnlyList<JsonElement> toolDeclarations,
        IReadOnlyList<AiAssistantIntentRoute> intentRoutes,
        Func<string, JsonElement, CancellationToken, Task<object>> executeTool,
        CancellationToken cancellationToken)
    {
        var history = NormalizeHistory(request.History);
        var contents = new List<JsonElement>();
        foreach (var item in history)
        {
            contents.Add(JsonSerializer.SerializeToElement(new
            {
                role = item.Role == "assistant" ? "model" : "user",
                parts = new[] { new { text = item.Content } }
            }));
        }

        contents.Add(JsonSerializer.SerializeToElement(new
        {
            role = "user",
            parts = new[] { new { text = request.Message.Trim() } }
        }));

        var providerRequestId = Guid.NewGuid().ToString("N");
        var dataSources = new HashSet<string>(StringComparer.OrdinalIgnoreCase);
        var totalInputTokens = 0;
        var totalOutputTokens = 0;
        var fallbackToolResults = new List<FallbackToolResult>();
        var requiredToolNames = intentRoutes
            .Select(route => route.ToolName)
            .Distinct(StringComparer.Ordinal)
            .ToArray();

        using var timeoutCts = CancellationTokenSource.CreateLinkedTokenSource(cancellationToken);
        timeoutCts.CancelAfter(ToolConversationTimeout);

        try
        {
            for (var round = 0; round < MaxToolRounds; round++)
            {
                using var providerCts = CancellationTokenSource.CreateLinkedTokenSource(timeoutCts.Token);
                providerCts.CancelAfter(ProviderRequestTimeout);

                using var document = await SendGenerateContentAsync(
                    model,
                    maxOutputTokens,
                    instructions,
                    contents,
                    toolDeclarations,
                    round == 0 ? requiredToolNames : [],
                    providerRequestId,
                    providerCts.Token);

                var usage = ExtractUsage(document.RootElement);
                totalInputTokens += usage.InputTokens;
                totalOutputTokens += usage.OutputTokens;

                if (IsSafetyBlocked(document.RootElement))
                {
                    return new AiAssistantChatResponseDto
                    {
                        Message = "Tôi không thể hỗ trợ nội dung này. Bạn có thể hỏi về dữ liệu và chức năng của nhà hàng.",
                        Model = model,
                        Blocked = true,
                        InputTokens = totalInputTokens,
                        OutputTokens = totalOutputTokens,
                        ProviderRequestId = providerRequestId,
                        DataSources = dataSources.Order().ToList()
                    };
                }

                var calls = ExtractFunctionCalls(document.RootElement);
                if (calls.Count == 0)
                {
                    var answer = ExtractOutputText(document.RootElement);
                    if (string.IsNullOrWhiteSpace(answer))
                    {
                        answer = "Tôi chưa có đủ dữ liệu để trả lời câu hỏi này. Bạn vui lòng thử diễn đạt cụ thể hơn.";
                    }

                    return new AiAssistantChatResponseDto
                    {
                        Message = answer.Trim(),
                        Model = model,
                        Blocked = false,
                        InputTokens = totalInputTokens,
                        OutputTokens = totalOutputTokens,
                        ProviderRequestId = providerRequestId,
                        DataSources = dataSources.Order().ToList()
                    };
                }

                var modelContent = ExtractCandidateContent(document.RootElement);
                if (modelContent.HasValue)
                    contents.Add(modelContent.Value);

                var responseParts = new List<object>();
                foreach (var call in calls)
                {
                    var routedArgs = round == 0
                        ? ApplyRequiredArguments(call, intentRoutes)
                        : call.Args;
                    object result;
                    try
                    {
                        result = await executeTool(call.Name, routedArgs, timeoutCts.Token);
                    }
                    catch (OperationCanceledException exception)
                        when (!timeoutCts.IsCancellationRequested)
                    {
                        _logger.LogWarning(
                            exception,
                            "AI tool {ToolName} was cancelled by its data source. RequestId={RequestId}",
                            call.Name,
                            providerRequestId);
                        result = CreateToolUnavailableResult(call.Name);
                    }
                    catch (Exception exception)
                    {
                        _logger.LogError(
                            exception,
                            "AI tool {ToolName} failed. RequestId={RequestId}",
                            call.Name,
                            providerRequestId);
                        result = CreateToolUnavailableResult(call.Name);
                    }

                    fallbackToolResults.Add(new FallbackToolResult(call.Name, result));
                    dataSources.Add(MapDataSource(call.Name, result));

                    responseParts.Add(new
                    {
                        functionResponse = new
                        {
                            name = call.Name,
                            id = call.Id,
                            response = new { result }
                        }
                    });
                }

                contents.Add(JsonSerializer.SerializeToElement(new
                {
                    role = "user",
                    parts = responseParts
                }));
            }
        }
        catch (OperationCanceledException exception)
            when (timeoutCts.IsCancellationRequested
                  && !cancellationToken.IsCancellationRequested)
        {
            _logger.LogWarning(
                exception,
                "Gemini tool conversation timed out after {TimeoutSeconds} seconds. RequestId={RequestId}",
                ToolConversationTimeout.TotalSeconds,
                providerRequestId);
            throw new InvalidOperationException(
                "Gemini phản hồi quá lâu. Vui lòng kiểm tra kết nối máy chủ rồi thử lại.",
                exception);
        }
        catch (OperationCanceledException exception)
            when (!cancellationToken.IsCancellationRequested)
        {
            _logger.LogWarning(
                exception,
                "Gemini provider request was cancelled before the conversation timeout. RequestId={RequestId}",
                providerRequestId);
            return intentRoutes.Count > 0
                ? await BuildReadOnlyFallbackResponseAsync(
                    request,
                    model,
                    providerRequestId,
                    totalInputTokens,
                    totalOutputTokens,
                    dataSources,
                    fallbackToolResults,
                    intentRoutes,
                    executeTool,
                    cancellationToken)
                : BuildProviderUnavailableResponse(
                    model,
                    providerRequestId,
                    totalInputTokens,
                    totalOutputTokens,
                    dataSources);
        }
        catch (InvalidOperationException exception)
            when (!cancellationToken.IsCancellationRequested)
        {
            if (intentRoutes.Count > 0)
            {
                _logger.LogWarning(
                    exception,
                    "Gemini provider request failed; returning read-only tool data. RequestId={RequestId}",
                    providerRequestId);
                return await BuildReadOnlyFallbackResponseAsync(
                    request,
                    model,
                    providerRequestId,
                    totalInputTokens,
                    totalOutputTokens,
                    dataSources,
                    fallbackToolResults,
                    intentRoutes,
                    executeTool,
                    cancellationToken);
            }

            _logger.LogWarning(
                exception,
                "Gemini provider request failed for an unclassified question. RequestId={RequestId}",
                providerRequestId);
            return BuildProviderUnavailableResponse(
                model,
                providerRequestId,
                totalInputTokens,
                totalOutputTokens,
                dataSources);
        }
        catch (Exception exception)
            when (exception is not OperationCanceledException
                  && !cancellationToken.IsCancellationRequested)
        {
            if (intentRoutes.Count > 0)
            {
                _logger.LogError(
                    exception,
                    "Unexpected AI conversation failure; returning read-only tool data. RequestId={RequestId}",
                    providerRequestId);
                return await BuildReadOnlyFallbackResponseAsync(
                    request,
                    model,
                    providerRequestId,
                    totalInputTokens,
                    totalOutputTokens,
                    dataSources,
                    fallbackToolResults,
                    intentRoutes,
                    executeTool,
                    cancellationToken);
            }

            _logger.LogError(
                exception,
                "Unexpected AI conversation failure for an unclassified question. RequestId={RequestId}",
                providerRequestId);
            return BuildProviderUnavailableResponse(
                model,
                providerRequestId,
                totalInputTokens,
                totalOutputTokens,
                dataSources);
        }

        return new AiAssistantChatResponseDto
        {
            Message = "Tôi đã truy vấn dữ liệu nhưng câu hỏi cần quá nhiều bước trong một lượt. Bạn hãy hỏi cụ thể hơn một phần để tôi kiểm tra chính xác.",
            Model = model,
            Blocked = false,
            InputTokens = totalInputTokens,
            OutputTokens = totalOutputTokens,
            ProviderRequestId = providerRequestId,
            DataSources = dataSources.Order().ToList()
        };
    }

    private static bool IsSafetyBlocked(JsonElement root)
    {
        if (root.TryGetProperty("promptFeedback", out var promptFeedback)
            && promptFeedback.ValueKind == JsonValueKind.Object
            && promptFeedback.TryGetProperty("blockReason", out var blockReason)
            && blockReason.ValueKind == JsonValueKind.String
            && !string.IsNullOrWhiteSpace(blockReason.GetString()))
        {
            return true;
        }

        if (!root.TryGetProperty("candidates", out var candidates)
            || candidates.ValueKind != JsonValueKind.Array)
            return false;

        foreach (var candidate in candidates.EnumerateArray())
        {
            if (candidate.TryGetProperty("finishReason", out var finishReason)
                && finishReason.ValueKind == JsonValueKind.String
                && string.Equals(finishReason.GetString(), "SAFETY", StringComparison.OrdinalIgnoreCase))
            {
                return true;
            }
        }

        return false;
    }

    private static string ExtractOutputText(JsonElement root)
    {
        var content = ExtractCandidateContent(root);
        if (!content.HasValue
            || !content.Value.TryGetProperty("parts", out var parts)
            || parts.ValueKind != JsonValueKind.Array)
            return string.Empty;

        var builder = new StringBuilder();
        foreach (var part in parts.EnumerateArray())
        {
            if (part.TryGetProperty("text", out var text)
                && text.ValueKind == JsonValueKind.String)
            {
                var value = text.GetString();
                if (string.IsNullOrWhiteSpace(value))
                    continue;
                if (builder.Length > 0)
                    builder.AppendLine();
                builder.Append(value);
            }
        }

        return builder.ToString();
    }

    private static JsonElement? ExtractCandidateContent(JsonElement root)
    {
        if (!root.TryGetProperty("candidates", out var candidates)
            || candidates.ValueKind != JsonValueKind.Array
            || candidates.GetArrayLength() == 0)
            return null;

        var candidate = candidates[0];
        if (!candidate.TryGetProperty("content", out var content)
            || content.ValueKind != JsonValueKind.Object)
            return null;

        return content.Clone();
    }

    private static List<GeminiFunctionCall> ExtractFunctionCalls(JsonElement root)
    {
        var result = new List<GeminiFunctionCall>();
        var content = ExtractCandidateContent(root);
        if (!content.HasValue
            || !content.Value.TryGetProperty("parts", out var parts)
            || parts.ValueKind != JsonValueKind.Array)
            return result;

        foreach (var part in parts.EnumerateArray())
        {
            if (!part.TryGetProperty("functionCall", out var functionCall)
                || functionCall.ValueKind != JsonValueKind.Object
                || !functionCall.TryGetProperty("name", out var nameElement)
                || nameElement.ValueKind != JsonValueKind.String)
                continue;

            var name = nameElement.GetString()?.Trim() ?? string.Empty;
            if (name.Length == 0)
                continue;

            var id = functionCall.TryGetProperty("id", out var idElement)
                && idElement.ValueKind == JsonValueKind.String
                ? idElement.GetString()?.Trim()
                : null;
            var args = functionCall.TryGetProperty("args", out var argsElement)
                && argsElement.ValueKind == JsonValueKind.Object
                ? argsElement.Clone()
                : JsonSerializer.SerializeToElement(new { });

            result.Add(new GeminiFunctionCall(name, id, args));
        }

        return result;
    }

    private static (int InputTokens, int OutputTokens) ExtractUsage(JsonElement root)
    {
        if (!root.TryGetProperty("usageMetadata", out var usage)
            || usage.ValueKind != JsonValueKind.Object)
            return (0, 0);

        var inputTokens = usage.TryGetProperty("promptTokenCount", out var input)
            && input.TryGetInt32(out var inputValue)
            ? inputValue
            : 0;
        var outputTokens = usage.TryGetProperty("candidatesTokenCount", out var output)
            && output.TryGetInt32(out var outputValue)
            ? outputValue
            : 0;

        return (inputTokens, outputTokens);
    }

    private static JsonElement ApplyRequiredArguments(
        GeminiFunctionCall call,
        IReadOnlyList<AiAssistantIntentRoute> intentRoutes)
    {
        if (!call.Name.Equals(AiAssistantToolNames.AdminModuleData, StringComparison.Ordinal))
            return call.Args;

        var matchingRoutes = intentRoutes
            .Where(route => route.ToolName.Equals(call.Name, StringComparison.Ordinal)
                            && route.RequiredModule is not null)
            .ToList();
        if (matchingRoutes.Count != 1)
            return call.Args;

        var arguments = JsonSerializer.Deserialize<Dictionary<string, JsonElement>>(
                            call.Args.GetRawText())
                        ?? new Dictionary<string, JsonElement>(StringComparer.Ordinal);
        arguments["module"] = JsonSerializer.SerializeToElement(matchingRoutes[0].RequiredModule);
        return JsonSerializer.SerializeToElement(arguments);
    }

    private sealed record GeminiFunctionCall(
        string Name,
        string? Id,
        JsonElement Args);
}
