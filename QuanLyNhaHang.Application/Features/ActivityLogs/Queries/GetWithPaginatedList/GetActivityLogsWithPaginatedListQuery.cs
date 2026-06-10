using MediatR;
using QuanLyNhaHang.Application.Common.Models;
using QuanLyNhaHang.Application.Features.ActivityLogs.DTOs;

namespace QuanLyNhaHang.Application.Features.ActivityLogs.Queries.GetWithPaginatedList;

public class GetActivityLogsWithPaginatedListQuery
    : IRequest<PaginatedList<ActivityLogDto>>
{
    public string? Keyword { get; set; }

    public Guid? UserId { get; set; }

    public string? Action { get; set; }

    public string? ModuleName { get; set; }

    public string? EntityName { get; set; }

    public Guid? EntityId { get; set; }

    public string? Status { get; set; }

    public DateTime? FromDate { get; set; }

    public DateTime? ToDate { get; set; }

    public int PageNumber { get; set; } = 1;

    public int PageSize { get; set; } = 10;
}