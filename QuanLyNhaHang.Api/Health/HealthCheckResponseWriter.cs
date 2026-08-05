using System.Text.Json;
using Microsoft.Extensions.Diagnostics.HealthChecks;

namespace QuanLyNhaHang.Api.Health;

public static class HealthCheckResponseWriter
{
    private static readonly JsonSerializerOptions JsonOptions =
        new(JsonSerializerDefaults.Web);

    public static async Task WriteAsync(
        HttpContext context,
        HealthReport report)
    {
        context.Response.ContentType =
            "application/json; charset=utf-8";

        var response = new
        {
            status = report.Status.ToString(),
            totalDurationMilliseconds = Math.Round(
                report.TotalDuration.TotalMilliseconds,
                2),
            checks = report.Entries
                .OrderBy(entry => entry.Key)
                .Select(entry => new
                {
                    name = entry.Key,
                    status = entry.Value.Status.ToString(),
                    description = entry.Value.Description,
                    durationMilliseconds = Math.Round(
                        entry.Value.Duration.TotalMilliseconds,
                        2)
                })
        };

        await JsonSerializer.SerializeAsync(
            context.Response.Body,
            response,
            JsonOptions,
            context.RequestAborted);
    }
}
