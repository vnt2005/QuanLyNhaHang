using MediatR;
using QuanLyNhaHang.Application.Features.ActivityLogs.DTOs;

namespace QuanLyNhaHang.Application.Features.ActivityLogs.Queries.GetById;

public class GetActivityLogByIdQuery : IRequest<ActivityLogDto?>
{
    public Guid Id { get; set; }
}