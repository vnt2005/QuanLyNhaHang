namespace QuanLyNhaHang.Application.Features.ActivityLogs.DTOs;

public class ActivityLogSummaryDto
{
    public int TotalLogs { get; set; }

    public int TotalSuccessLogs { get; set; }

    public int TotalFailedLogs { get; set; }

    public int TotalTodayLogs { get; set; }

    public int TotalTodaySuccessLogs { get; set; }

    public int TotalTodayFailedLogs { get; set; }
}