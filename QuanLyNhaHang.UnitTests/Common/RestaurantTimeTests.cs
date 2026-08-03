using QuanLyNhaHang.Application.Common.Time;

namespace QuanLyNhaHang.UnitTests.Common;

public class RestaurantTimeTests
{
    [Fact]
    public void GetUtcRange_ConvertsVietnamDayToUtcBoundaries()
    {
        var localDate = new DateTime(2026, 8, 4);

        var range = RestaurantTime.GetUtcRange(localDate, localDate);

        Assert.Equal(
            new DateTime(2026, 8, 3, 17, 0, 0, DateTimeKind.Utc),
            range.StartUtc);
        Assert.Equal(
            new DateTime(2026, 8, 4, 17, 0, 0, DateTimeKind.Utc),
            range.EndUtc);
    }

    [Fact]
    public void GetUtcRange_UsesExclusiveEndForMultipleVietnamDays()
    {
        var range = RestaurantTime.GetUtcRange(
            new DateTime(2026, 8, 4),
            new DateTime(2026, 8, 6));

        Assert.Equal(
            new DateTime(2026, 8, 3, 17, 0, 0, DateTimeKind.Utc),
            range.StartUtc);
        Assert.Equal(
            new DateTime(2026, 8, 6, 17, 0, 0, DateTimeKind.Utc),
            range.EndUtc);
    }

    [Fact]
    public void ToLocal_AssignsEarlyUtcHoursToTheCorrectVietnamDay()
    {
        var utcValue = new DateTime(
            2026,
            8,
            3,
            17,
            30,
            0,
            DateTimeKind.Utc);

        var localValue = RestaurantTime.ToLocal(utcValue);

        Assert.Equal(new DateTime(2026, 8, 4, 0, 30, 0), localValue);
    }

    [Fact]
    public void ToUtc_TreatsUnspecifiedInputAsVietnamLocalTime()
    {
        var localValue = new DateTime(
            2026,
            8,
            4,
            19,
            15,
            0,
            DateTimeKind.Unspecified);

        var utcValue = RestaurantTime.ToUtc(localValue);

        Assert.Equal(
            new DateTime(2026, 8, 4, 12, 15, 0, DateTimeKind.Utc),
            utcValue);
    }
}
