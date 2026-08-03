namespace QuanLyNhaHang.Application.Common.Time;

public static class RestaurantTime
{
    public const string TimeZoneId = "Asia/Ho_Chi_Minh";

    private static readonly TimeZoneInfo TimeZone = ResolveTimeZone();

    public static DateTime UtcNow => DateTime.UtcNow;

    public static DateTime LocalNow => TimeZoneInfo.ConvertTimeFromUtc(UtcNow, TimeZone);

    public static DateTime LocalToday => LocalNow.Date;

    public static DateTime ToUtc(DateTime value)
    {
        return value.Kind switch
        {
            DateTimeKind.Utc => value,
            DateTimeKind.Local => value.ToUniversalTime(),
            _ => TimeZoneInfo.ConvertTimeToUtc(
                DateTime.SpecifyKind(value, DateTimeKind.Unspecified),
                TimeZone)
        };
    }

    public static DateTime ToLocal(DateTime value)
    {
        var utcValue = value.Kind switch
        {
            DateTimeKind.Utc => value,
            DateTimeKind.Local => value.ToUniversalTime(),
            _ => DateTime.SpecifyKind(value, DateTimeKind.Utc)
        };

        return TimeZoneInfo.ConvertTimeFromUtc(utcValue, TimeZone);
    }

    public static (DateTime StartUtc, DateTime EndUtc) GetUtcRange(
        DateTime fromLocalDate,
        DateTime toLocalDate)
    {
        var startLocal = DateTime.SpecifyKind(
            fromLocalDate.Date,
            DateTimeKind.Unspecified);
        var endLocal = DateTime.SpecifyKind(
            toLocalDate.Date.AddDays(1),
            DateTimeKind.Unspecified);

        return (
            TimeZoneInfo.ConvertTimeToUtc(startLocal, TimeZone),
            TimeZoneInfo.ConvertTimeToUtc(endLocal, TimeZone));
    }

    public static DateTime GetUtcStart(DateTime localDate)
    {
        return GetUtcRange(localDate, localDate).StartUtc;
    }

    public static DateTime GetUtcEndExclusive(DateTime localDate)
    {
        return GetUtcRange(localDate, localDate).EndUtc;
    }

    private static TimeZoneInfo ResolveTimeZone()
    {
        try
        {
            return TimeZoneInfo.FindSystemTimeZoneById(TimeZoneId);
        }
        catch (TimeZoneNotFoundException)
        {
            return TimeZoneInfo.FindSystemTimeZoneById("SE Asia Standard Time");
        }
    }
}
