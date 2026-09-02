using System.Globalization;
using System.Text.Json;

namespace QuanLyNhaHang.Infrastructure.AI;

internal static class AiToolArguments
{
    public static string GetString(JsonElement args, string property)
    {
        return args.ValueKind == JsonValueKind.Object
            && args.TryGetProperty(property, out var value)
            && value.ValueKind == JsonValueKind.String
                ? value.GetString()?.Trim() ?? string.Empty
                : string.Empty;
    }

    public static int GetInt(JsonElement args, string property, int fallback)
    {
        if (args.ValueKind == JsonValueKind.Object
            && args.TryGetProperty(property, out var value))
        {
            if (value.ValueKind == JsonValueKind.Number && value.TryGetInt32(out var number))
                return number;
            if (value.ValueKind == JsonValueKind.String
                && int.TryParse(value.GetString(), NumberStyles.Integer, CultureInfo.InvariantCulture, out number))
                return number;
        }

        return fallback;
    }

    public static bool GetBoolean(JsonElement args, string property, bool fallback)
    {
        if (args.ValueKind == JsonValueKind.Object
            && args.TryGetProperty(property, out var value))
        {
            if (value.ValueKind is JsonValueKind.True or JsonValueKind.False)
                return value.GetBoolean();
            if (value.ValueKind == JsonValueKind.String && bool.TryParse(value.GetString(), out var result))
                return result;
        }

        return fallback;
    }

    public static int GetLimit(JsonElement args, int fallback, int maximum)
        => Math.Clamp(GetInt(args, "limit", fallback), 1, maximum);

    public static DateTime? GetDate(JsonElement args, string property)
    {
        var value = GetString(args, property);
        if (DateTime.TryParse(
                value,
                CultureInfo.InvariantCulture,
                DateTimeStyles.AssumeUniversal,
                out var parsed))
        {
            return parsed.ToUniversalTime().Date;
        }

        return null;
    }

    public static DateTime? GetDateTime(JsonElement args, string property)
    {
        var value = GetString(args, property);
        if (DateTime.TryParse(
                value,
                CultureInfo.InvariantCulture,
                DateTimeStyles.AssumeUniversal,
                out var parsed))
        {
            return parsed.ToUniversalTime();
        }

        return null;
    }
}
