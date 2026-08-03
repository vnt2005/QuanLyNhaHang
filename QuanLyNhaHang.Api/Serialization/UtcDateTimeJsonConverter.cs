using System.Globalization;
using System.Text.Json;
using System.Text.Json.Serialization;
using QuanLyNhaHang.Application.Common.Time;

namespace QuanLyNhaHang.Api.Serialization;

public sealed class UtcDateTimeJsonConverter : JsonConverter<DateTime>
{
    public override DateTime Read(
        ref Utf8JsonReader reader,
        Type typeToConvert,
        JsonSerializerOptions options)
    {
        if (reader.TokenType != JsonTokenType.String)
            throw new JsonException("Giá trị thời gian phải là chuỗi ISO 8601.");

        var value = reader.GetString();
        if (string.IsNullOrWhiteSpace(value))
            throw new JsonException("Giá trị thời gian không được để trống.");

        if (DateTimeOffset.TryParse(
                value,
                CultureInfo.InvariantCulture,
                DateTimeStyles.AllowWhiteSpaces,
                out var dateTimeOffset) &&
            HasExplicitOffset(value))
        {
            return dateTimeOffset.UtcDateTime;
        }

        if (!DateTime.TryParse(
                value,
                CultureInfo.InvariantCulture,
                DateTimeStyles.AllowWhiteSpaces,
                out var localDateTime))
        {
            throw new JsonException("Giá trị thời gian không đúng định dạng ISO 8601.");
        }

        return RestaurantTime.ToUtc(
            DateTime.SpecifyKind(localDateTime, DateTimeKind.Unspecified));
    }

    public override void Write(
        Utf8JsonWriter writer,
        DateTime value,
        JsonSerializerOptions options)
    {
        var utcValue = value.Kind switch
        {
            DateTimeKind.Utc => value,
            DateTimeKind.Local => value.ToUniversalTime(),
            _ => DateTime.SpecifyKind(value, DateTimeKind.Utc)
        };

        writer.WriteStringValue(utcValue);
    }

    private static bool HasExplicitOffset(string value)
    {
        var trimmed = value.Trim();
        if (trimmed.EndsWith('Z') || trimmed.EndsWith('z'))
            return true;

        var timeSeparatorIndex = trimmed.IndexOf('T');
        if (timeSeparatorIndex < 0)
            timeSeparatorIndex = trimmed.IndexOf(' ');

        if (timeSeparatorIndex < 0)
            return false;

        return trimmed.LastIndexOf('+') > timeSeparatorIndex ||
               trimmed.LastIndexOf('-') > timeSeparatorIndex;
    }
}
