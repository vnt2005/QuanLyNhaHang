using System.Text.Json;
using QuanLyNhaHang.Api.Serialization;
using Xunit;

namespace QuanLyNhaHang.IntegrationTests.Serialization;

public class UtcDateTimeJsonConverterTests
{
    private static JsonSerializerOptions CreateOptions()
    {
        var options = new JsonSerializerOptions();
        options.Converters.Add(new UtcDateTimeJsonConverter());
        return options;
    }

    [Fact]
    public void Deserialize_DateOnly_PreservesRestaurantCalendarDate()
    {
        var value = JsonSerializer.Deserialize<DateTime>(
            "\"2026-08-04\"",
            CreateOptions());

        Assert.Equal(new DateTime(2026, 8, 4), value);
        Assert.Equal(DateTimeKind.Unspecified, value.Kind);
    }

    [Fact]
    public void Deserialize_VietnamTimestamp_ConvertsToUtcInstant()
    {
        var value = JsonSerializer.Deserialize<DateTime>(
            "\"2026-08-04T19:15:00+07:00\"",
            CreateOptions());

        Assert.Equal(
            new DateTime(2026, 8, 4, 12, 15, 0, DateTimeKind.Utc),
            value);
    }

    [Fact]
    public void Serialize_DatabaseTimestamp_WritesUtcDesignator()
    {
        var value = new DateTime(
            2026,
            8,
            4,
            12,
            15,
            0,
            DateTimeKind.Unspecified);

        var json = JsonSerializer.Serialize(value, CreateOptions());

        Assert.Equal("\"2026-08-04T12:15:00Z\"", json);
    }
}
