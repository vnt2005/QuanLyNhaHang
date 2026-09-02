using System.Text;
using System.Text.Json;
using System.Text.RegularExpressions;
using Microsoft.Extensions.Logging;
using QuanLyNhaHang.Application.Features.AiAssistant;
using QuanLyNhaHang.Application.Features.AiAssistant.DTOs;

namespace QuanLyNhaHang.Infrastructure.AI;

public sealed partial class GeminiAiAssistantService
{
    private static readonly JsonSerializerOptions FallbackJsonOptions =
        new(JsonSerializerDefaults.Web)
        {
            WriteIndented = true,
            MaxDepth = 16
        };

    private static AiAssistantChatResponseDto BuildProviderUnavailableResponse(
        string model,
        string providerRequestId,
        int totalInputTokens,
        int totalOutputTokens,
        HashSet<string> dataSources)
    {
        return new AiAssistantChatResponseDto
        {
            Message = "Dịch vụ AI đang tạm thời chưa sẵn sàng nên tôi chưa thể trả lời câu hỏi tự do này mà không suy đoán. Bạn có thể hỏi về thực đơn, phương thức thanh toán, bàn, khuyến mãi, đơn hàng hoặc doanh thu.",
            Model = model,
            Blocked = false,
            InputTokens = totalInputTokens,
            OutputTokens = totalOutputTokens,
            ProviderRequestId = providerRequestId,
            DataSources = dataSources.Order().ToList()
        };
    }

    private async Task<AiAssistantChatResponseDto> BuildReadOnlyFallbackResponseAsync(
        AiAssistantChatRequestDto request,
        string model,
        string providerRequestId,
        int totalInputTokens,
        int totalOutputTokens,
        HashSet<string> dataSources,
        List<FallbackToolResult> toolResults,
        IReadOnlyList<AiAssistantIntentRoute> intentRoutes,
        Func<string, JsonElement, CancellationToken, Task<object>> executeTool,
        CancellationToken cancellationToken)
    {
        if (toolResults.Count == 0)
        {
            foreach (var route in intentRoutes
                         .GroupBy(item => $"{item.ToolName}:{item.RequiredModule}", StringComparer.Ordinal)
                         .Select(group => group.First()))
            {
                var args = BuildFallbackArguments(route, request.Message);
                object result;
                try
                {
                    result = await executeTool(route.ToolName, args, cancellationToken);
                }
                catch (OperationCanceledException)
                {
                    throw;
                }
                catch (Exception exception)
                {
                    _logger.LogError(
                        exception,
                        "AI fallback tool {ToolName} failed. RequestId={RequestId}",
                        route.ToolName,
                        providerRequestId);
                    result = CreateToolUnavailableResult(route.ToolName);
                }

                toolResults.Add(new FallbackToolResult(route.ToolName, result));
                dataSources.Add(MapDataSource(route.ToolName, result));
            }
        }

        var message = new StringBuilder();
        message.AppendLine(
            "Mình đã đọc dữ liệu READ-ONLY từ hệ thống. Dịch vụ Gemini đang tạm gián đoạn nên mình trả kết quả dữ liệu trực tiếp để bạn không phải chờ thêm:");

        foreach (var toolResult in toolResults)
        {
            message.AppendLine();
            message.Append('[')
                .Append(GetFallbackToolLabel(toolResult.ToolName))
                .AppendLine("]");
            message.AppendLine(SerializeFallbackResult(toolResult.Result));
        }

        return new AiAssistantChatResponseDto
        {
            Message = message.ToString().Trim(),
            Model = model,
            Blocked = false,
            InputTokens = totalInputTokens,
            OutputTokens = totalOutputTokens,
            ProviderRequestId = providerRequestId,
            DataSources = dataSources.Order().ToList()
        };
    }

    private static JsonElement BuildFallbackArguments(
        AiAssistantIntentRoute route,
        string message)
    {
        if (route.ToolName == AiAssistantToolNames.AdminModuleData
            && !string.IsNullOrWhiteSpace(route.RequiredModule))
        {
            return JsonSerializer.SerializeToElement(new
            {
                module = route.RequiredModule
            });
        }

        if (route.ToolName == AiAssistantToolNames.TableAvailability)
        {
            var match = Regex.Match(
                message,
                @"(?<guests>\d{1,3})\s*(?:người|khách)",
                RegexOptions.IgnoreCase | RegexOptions.CultureInvariant);
            var guests = match.Success
                         && int.TryParse(match.Groups["guests"].Value, out var parsed)
                ? Math.Clamp(parsed, 1, 100)
                : 1;

            return JsonSerializer.SerializeToElement(new { guests });
        }

        return JsonSerializer.SerializeToElement(new { });
    }

    private static object CreateToolUnavailableResult(string toolName)
        => new
        {
            available = false,
            tool = toolName,
            error = "Công cụ chưa đọc được dữ liệu ở thời điểm này."
        };

    private static string GetFallbackToolLabel(string toolName)
        => toolName switch
        {
            AiAssistantToolNames.AdminOverview => "Tổng quan vận hành",
            AiAssistantToolNames.AdminModuleData => "Dữ liệu module quản trị",
            AiAssistantToolNames.PaymentOptions => "Phương thức thanh toán",
            AiAssistantToolNames.SearchMenu => "Thực đơn",
            AiAssistantToolNames.ActivePromotions => "Khuyến mãi",
            AiAssistantToolNames.RestaurantInfo => "Thông tin nhà hàng",
            AiAssistantToolNames.TableAvailability => "Bàn phù hợp",
            AiAssistantToolNames.MyOrders => "Đơn hàng của bạn",
            AiAssistantToolNames.MyNotifications => "Thông báo của bạn",
            _ => toolName
        };

    private string SerializeFallbackResult(object result)
    {
        try
        {
            var json = JsonSerializer.Serialize(result, FallbackJsonOptions);
            return json.Length <= 12000
                ? json
                : json[..12000] + "\n… (đã rút gọn để bảo vệ kích thước phản hồi)";
        }
        catch (JsonException exception)
        {
            _logger.LogWarning(
                exception,
                "AI fallback result could not be serialized as JSON.");
            return "Dữ liệu đã được truy vấn nhưng không thể hiển thị chi tiết.";
        }
        catch (NotSupportedException exception)
        {
            _logger.LogWarning(
                exception,
                "AI fallback result contains an unsupported value.");
            return "Dữ liệu đã được truy vấn nhưng không thể hiển thị chi tiết.";
        }
    }

    private static string MapDataSource(string toolName, object result)
    {
        _ = result;
        return toolName switch
        {
            AiAssistantToolNames.RestaurantInfo => "Nhà hàng & bàn",
            AiAssistantToolNames.PaymentOptions => "Phương thức thanh toán",
            AiAssistantToolNames.SearchMenu => "Thực đơn",
            AiAssistantToolNames.ActivePromotions => "Khuyến mãi",
            AiAssistantToolNames.TableAvailability => "Đặt bàn",
            AiAssistantToolNames.WebsiteCapabilities => "Chức năng website",
            AiAssistantToolNames.MyOrders => "Đơn/Bếp/Thanh toán của bạn",
            AiAssistantToolNames.MyNotifications => "Thông báo của bạn",
            AiAssistantToolNames.AdminOverview => "Tổng quan vận hành",
            AiAssistantToolNames.AdminModuleData => "Dữ liệu WebApp",
            _ => toolName
        };
    }

    private sealed record FallbackToolResult(
        string ToolName,
        object Result);
}
