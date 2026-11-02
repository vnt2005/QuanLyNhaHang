using System.Globalization;
using System.Text;
using System.Text.Json;
using System.Text.RegularExpressions;
using Microsoft.Extensions.Logging;
using QuanLyNhaHang.Application.Features.AiAssistant;
using QuanLyNhaHang.Application.Features.AiAssistant.DTOs;

namespace QuanLyNhaHang.Infrastructure.AI;

public sealed partial class GeminiAiAssistantService
{
    private static readonly CultureInfo ViCulture = CultureInfo.GetCultureInfo("vi-VN");

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
            "Hệ thống gửi bạn thông tin trực tiếp từ cơ sở dữ liệu nhà hàng (dịch vụ AI đang tạm gián đoạn nên mình hiển thị dữ liệu trực tiếp để bạn không phải chờ):");

        foreach (var toolResult in toolResults)
        {
            message.AppendLine();
            message.Append("📌 [")
                .Append(GetFallbackToolLabel(toolResult.ToolName))
                .AppendLine("]");
            message.AppendLine(FormatFallbackResult(toolResult.ToolName, toolResult.Result));
        }

        message.AppendLine();
        message.AppendLine("*(Bạn có thể hỏi thêm thông tin khác hoặc thử lại sau khi kết nối AI ổn định nhé!)*");

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

    private string FormatFallbackResult(string toolName, object result)
    {
        try
        {
            var element = JsonSerializer.SerializeToElement(result, FallbackJsonOptions);
            return toolName switch
            {
                AiAssistantToolNames.SearchMenu => FormatMenuFallback(element),
                AiAssistantToolNames.ActivePromotions => FormatPromotionsFallback(element),
                AiAssistantToolNames.RestaurantInfo => FormatRestaurantInfoFallback(element),
                AiAssistantToolNames.PaymentOptions => FormatPaymentOptionsFallback(element),
                AiAssistantToolNames.TableAvailability => FormatTableAvailabilityFallback(element),
                AiAssistantToolNames.WebsiteCapabilities => FormatWebsiteCapabilitiesFallback(element),
                AiAssistantToolNames.MyOrders => FormatMyOrdersFallback(element),
                AiAssistantToolNames.AdminOverview => FormatAdminOverviewFallback(element),
                AiAssistantToolNames.AdminModuleData => FormatAdminModuleDataFallback(element),
                _ => FormatGenericFallback(element)
            };
        }
        catch (Exception exception)
        {
            _logger.LogWarning(
                exception,
                "Failed to format fallback result for tool {ToolName}; defaulting to simplified serializer.",
                toolName);
            return SerializeFallbackResult(result);
        }
    }

    private static string FormatMenuFallback(JsonElement element)
    {
        if (element.TryGetProperty("items", out var itemsElem) && itemsElem.ValueKind == JsonValueKind.Array)
        {
            var sb = new StringBuilder();
            var count = 0;
            foreach (var item in itemsElem.EnumerateArray())
            {
                var name = item.TryGetProperty("name", out var np) ? np.GetString() : null;
                var category = item.TryGetProperty("category", out var cp) ? cp.GetString() : null;
                var price = item.TryGetProperty("price", out var pp) && pp.TryGetDecimal(out var pVal) ? pVal : 0m;
                var desc = item.TryGetProperty("description", out var dp) ? dp.GetString() : null;
                var isAvailable = item.TryGetProperty("isAvailable", out var ap) && ap.GetBoolean();

                if (string.IsNullOrWhiteSpace(name)) continue;
                count++;
                sb.Append("• **").Append(name).Append("**");
                if (!string.IsNullOrWhiteSpace(category))
                {
                    sb.Append(" (").Append(category).Append(')');
                }
                sb.Append(": ").Append(price.ToString("N0", ViCulture)).Append(" đ");
                if (!isAvailable)
                {
                    sb.Append(" *(Tạm hết món)*");
                }
                sb.AppendLine();
                if (!string.IsNullOrWhiteSpace(desc))
                {
                    sb.Append("  ").AppendLine(desc.Trim());
                }
            }
            if (count > 0)
            {
                return sb.ToString().TrimEnd();
            }
        }
        return "Hiện không tìm thấy món ăn nào phù hợp với yêu cầu tìm kiếm.";
    }

    private static string FormatPromotionsFallback(JsonElement element)
    {
        if (element.TryGetProperty("promotions", out var promoElem) && promoElem.ValueKind == JsonValueKind.Array)
        {
            var sb = new StringBuilder();
            var count = 0;
            foreach (var promo in promoElem.EnumerateArray())
            {
                var code = promo.TryGetProperty("promotionCode", out var cp) ? cp.GetString() : null;
                var name = promo.TryGetProperty("name", out var np) ? np.GetString() : null;
                var desc = promo.TryGetProperty("description", out var dp) ? dp.GetString() : null;
                var discountType = promo.TryGetProperty("discountType", out var dtp) ? dtp.GetString() : null;
                var discountVal = promo.TryGetProperty("discountValue", out var dvp) && dvp.TryGetDecimal(out var dVal) ? dVal : 0m;
                var minOrder = promo.TryGetProperty("minimumOrderAmount", out var mop) && mop.TryGetDecimal(out var moVal) ? moVal : 0m;
                var maxDiscount = promo.TryGetProperty("maximumDiscountAmount", out var mdp) && mdp.TryGetDecimal(out var mdVal) ? mdVal : 0m;
                var endDate = promo.TryGetProperty("endDate", out var edp) && edp.TryGetDateTime(out var ed) ? ed : (DateTime?)null;

                if (string.IsNullOrWhiteSpace(code) && string.IsNullOrWhiteSpace(name)) continue;
                count++;
                sb.Append("• Mã: **").Append(code ?? name).Append("**");
                if (!string.IsNullOrWhiteSpace(name) && name != code)
                {
                    sb.Append(" - ").Append(name);
                }
                sb.AppendLine();

                var discountStr = discountType?.Equals("Percentage", StringComparison.OrdinalIgnoreCase) == true
                    ? $"Giảm {discountVal:0.##}%"
                    : $"Giảm {discountVal.ToString("N0", ViCulture)} đ";

                if (maxDiscount > 0)
                {
                    discountStr += $" (Tối đa {maxDiscount.ToString("N0", ViCulture)} đ)";
                }
                if (minOrder > 0)
                {
                    discountStr += $" cho đơn từ {minOrder.ToString("N0", ViCulture)} đ";
                }
                sb.Append("  ").AppendLine(discountStr);
                if (!string.IsNullOrWhiteSpace(desc))
                {
                    sb.Append("  ").AppendLine(desc.Trim());
                }
                if (endDate.HasValue)
                {
                    sb.Append("  *(Hạn áp dụng: ").Append(endDate.Value.ToString("dd/MM/yyyy HH:mm")).AppendLine(")*");
                }
            }
            if (count > 0)
            {
                return sb.ToString().TrimEnd();
            }
        }
        return "Hiện tại nhà hàng chưa có chương trình khuyến mãi nào đang diễn ra.";
    }

    private static string FormatRestaurantInfoFallback(JsonElement element)
    {
        var sb = new StringBuilder();
        if (element.TryGetProperty("restaurantName", out var rn) && !string.IsNullOrWhiteSpace(rn.GetString()))
            sb.Append("• Tên nhà hàng: **").Append(rn.GetString()).AppendLine("**");
        if (element.TryGetProperty("address", out var ad) && !string.IsNullOrWhiteSpace(ad.GetString()))
            sb.Append("• Địa chỉ: ").AppendLine(ad.GetString());
        if (element.TryGetProperty("phoneNumber", out var pn) && !string.IsNullOrWhiteSpace(pn.GetString()))
            sb.Append("• Số điện thoại: ").AppendLine(pn.GetString());
        if (element.TryGetProperty("email", out var em) && !string.IsNullOrWhiteSpace(em.GetString()))
            sb.Append("• Email: ").AppendLine(em.GetString());
        if (element.TryGetProperty("openingTime", out var ot) && element.TryGetProperty("closingTime", out var ct))
            sb.Append("• Giờ phục vụ: ").Append(ot.GetString()).Append(" - ").AppendLine(ct.GetString());
        if (element.TryGetProperty("defaultVatPercent", out var vat) && vat.TryGetDecimal(out var vatVal) && vatVal > 0)
            sb.Append("• Thuế VAT: ").Append(vatVal).AppendLine("%");
        if (element.TryGetProperty("serviceChargePercent", out var sc) && sc.TryGetDecimal(out var scVal) && scVal > 0)
            sb.Append("• Phí phục vụ: ").Append(scVal).AppendLine("%");
        return sb.Length > 0 ? sb.ToString().TrimEnd() : "Chưa có thông tin cập nhật của nhà hàng.";
    }

    private static string FormatPaymentOptionsFallback(JsonElement element)
    {
        var sb = new StringBuilder();
        sb.AppendLine("• **Tại quầy:** Tiền mặt, Thẻ ngân hàng (POS), Chuyển khoản VietQR.");
        sb.AppendLine("• **Trực tuyến (Web / QR tại bàn):** Quét mã VietQR chuyển khoản tự động qua cổng SePay.");
        return sb.ToString().TrimEnd();
    }

    private static string FormatTableAvailabilityFallback(JsonElement element)
    {
        var sb = new StringBuilder();
        var count = 0;
        if (element.TryGetProperty("candidates", out var candElem) && candElem.ValueKind == JsonValueKind.Array)
        {
            foreach (var cand in candElem.EnumerateArray())
            {
                var name = cand.TryGetProperty("name", out var np) ? np.GetString() : null;
                var area = cand.TryGetProperty("area", out var ap) ? ap.GetString() : "Khu vực chính";
                var cap = cand.TryGetProperty("capacity", out var cp) && cp.TryGetInt32(out var cVal) ? cVal : 0;
                var status = cand.TryGetProperty("currentStatus", out var sp) ? sp.GetString() : null;

                if (string.IsNullOrWhiteSpace(name)) continue;
                count++;
                var statusStr = status == "Available" ? "Đang trống" : (status ?? "Sẵn sàng");
                sb.Append("• Bàn **").Append(name).Append("** (Khu vực: ").Append(area)
                  .Append(", Sức chứa: ").Append(cap).Append(" khách) - Trạng thái: ").AppendLine(statusStr);
            }
        }
        if (count == 0)
        {
            return "Hiện tại chưa có bàn trống phù hợp với số lượng khách yêu cầu. Quý khách có thể liên hệ trực tiếp nhà hàng hoặc gửi yêu cầu trên trang Đặt bàn.";
        }
        sb.AppendLine("\n*(Bạn có thể vào mục Đặt bàn trên website để đặt trước bàn theo nhu cầu nhé)*");
        return sb.ToString().TrimEnd();
    }

    private static string FormatWebsiteCapabilitiesFallback(JsonElement element)
    {
        if (element.TryGetProperty("pages", out var pagesElem) && pagesElem.ValueKind == JsonValueKind.Array)
        {
            var sb = new StringBuilder();
            foreach (var page in pagesElem.EnumerateArray())
            {
                var name = page.TryGetProperty("name", out var np) ? np.GetString() : null;
                var purpose = page.TryGetProperty("purpose", out var pp) ? pp.GetString() : null;
                if (!string.IsNullOrWhiteSpace(name))
                {
                    sb.Append("• **").Append(name).Append("**: ").AppendLine(purpose ?? string.Empty);
                }
            }
            if (sb.Length > 0) return sb.ToString().TrimEnd();
        }
        return "Website hỗ trợ xem thực đơn, đặt bàn trực tuyến, gọi món tại bàn bằng QR và đặt món mang về.";
    }

    private static string FormatMyOrdersFallback(JsonElement element)
    {
        if (element.TryGetProperty("orders", out var ordersElem) && ordersElem.ValueKind == JsonValueKind.Array)
        {
            var sb = new StringBuilder();
            var count = 0;
            foreach (var order in ordersElem.EnumerateArray())
            {
                var code = order.TryGetProperty("orderCode", out var cp) ? cp.GetString() : null;
                var status = order.TryGetProperty("status", out var sp) ? sp.GetString() : null;
                var total = order.TryGetProperty("totalAmount", out var tp) && tp.TryGetDecimal(out var tVal) ? tVal : 0m;
                var type = order.TryGetProperty("orderType", out var otp) ? otp.GetString() : null;

                if (string.IsNullOrWhiteSpace(code)) continue;
                count++;
                sb.Append("• Đơn hàng #**").Append(code).Append("** (Loại: ").Append(type ?? "Tại bàn")
                  .Append(") - Trạng thái: ").Append(status ?? "Đang xử lý")
                  .Append(" - Tổng tiền: ").Append(total.ToString("N0", ViCulture)).AppendLine(" đ");
            }
            if (count > 0) return sb.ToString().TrimEnd();
        }
        if (element.TryGetProperty("reason", out var reasonElem))
        {
            return reasonElem.GetString() ?? "Vui lòng đăng nhập để xem thông tin đơn hàng của bạn.";
        }
        return "Bạn chưa có đơn hàng nào gần đây.";
    }

    private static string FormatAdminOverviewFallback(JsonElement element)
    {
        var sb = new StringBuilder();
        if (element.TryGetProperty("payments", out var payments) &&
            payments.TryGetProperty("revenueToday", out var rev) && rev.TryGetDecimal(out var revVal))
        {
            sb.Append("• Doanh thu hôm nay: **").Append(revVal.ToString("N0", ViCulture)).AppendLine(" đ**");
        }
        if (element.TryGetProperty("orders", out var orders))
        {
            var today = orders.TryGetProperty("today", out var otp) && otp.TryGetInt32(out var t) ? t : 0;
            var pending = orders.TryGetProperty("pending", out var opp) && opp.TryGetInt32(out var p) ? p : 0;
            var cooking = orders.TryGetProperty("cooking", out var ocp) && ocp.TryGetInt32(out var c) ? c : 0;
            var ready = orders.TryGetProperty("ready", out var orp) && orp.TryGetInt32(out var r) ? r : 0;
            sb.Append("• Đơn hàng hôm nay: ").Append(today)
              .Append(" (Đang chờ: ").Append(pending)
              .Append(", Đang chế biến: ").Append(cooking)
              .Append(", Sẵn sàng: ").Append(ready).AppendLine(")");
        }
        if (element.TryGetProperty("restaurant", out var rest))
        {
            var totalTables = rest.TryGetProperty("tables", out var ttp) && ttp.TryGetInt32(out var tt) ? tt : 0;
            var availTables = rest.TryGetProperty("availableTables", out var atp) && atp.TryGetInt32(out var at) ? at : 0;
            sb.Append("• Bàn ăn: ").Append(availTables).Append(" bàn trống / ").Append(totalTables).AppendLine(" tổng số bàn");
        }
        if (element.TryGetProperty("kitchen", out var kitchen))
        {
            var pendingItems = kitchen.TryGetProperty("pendingItems", out var pip) && pip.TryGetInt32(out var pi) ? pi : 0;
            var cookingItems = kitchen.TryGetProperty("cookingItems", out var cip) && cip.TryGetInt32(out var ci) ? ci : 0;
            var readyItems = kitchen.TryGetProperty("readyItems", out var rip) && rip.TryGetInt32(out var ri) ? ri : 0;
            sb.Append("• Món bếp: ").Append(pendingItems).Append(" chờ nhận, ")
              .Append(cookingItems).Append(" đang nấu, ")
              .Append(readyItems).AppendLine(" đã ra món");
        }
        return sb.Length > 0 ? sb.ToString().TrimEnd() : "Không thể tải tổng quan vận hành lúc này.";
    }

    private static string FormatAdminModuleDataFallback(JsonElement element)
    {
        if (element.TryGetProperty("error", out var err))
        {
            return $"⚠️ {err.GetString()}";
        }
        return FormatGenericFallback(element);
    }

    private static string FormatGenericFallback(JsonElement element)
    {
        if (element.ValueKind == JsonValueKind.Object)
        {
            if (element.TryGetProperty("available", out var avail) && !avail.GetBoolean())
            {
                var err = element.TryGetProperty("error", out var ep) ? ep.GetString() : null;
                return $"⚠️ {err ?? "Dữ liệu hiện chưa thể truy xuất lúc này."}";
            }

            var sb = new StringBuilder();
            foreach (var prop in element.EnumerateObject())
            {
                if (prop.Value.ValueKind == JsonValueKind.Array)
                {
                    sb.Append("• **").Append(prop.Name).Append("**: ").Append(prop.Value.GetArrayLength()).AppendLine(" mục");
                }
                else if (prop.Value.ValueKind != JsonValueKind.Object)
                {
                    sb.Append("• ").Append(prop.Name).Append(": ").AppendLine(prop.Value.ToString());
                }
            }
            if (sb.Length > 0) return sb.ToString().TrimEnd();
        }
        return "Đã nhận được dữ liệu từ hệ thống.";
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
