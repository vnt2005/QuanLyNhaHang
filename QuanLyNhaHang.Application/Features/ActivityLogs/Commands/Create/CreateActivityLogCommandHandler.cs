using MediatR;
using QuanLyNhaHang.Application.Common.Interfaces;
using QuanLyNhaHang.Application.Features.ActivityLogs.DTOs;
using QuanLyNhaHang.Domain.Entities;

namespace QuanLyNhaHang.Application.Features.ActivityLogs.Commands.Create;

public class CreateActivityLogCommandHandler
    : IRequestHandler<CreateActivityLogCommand, ActivityLogDto>
{
    private readonly IApplicationDbContext _context;

    public CreateActivityLogCommandHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<ActivityLogDto> Handle(
        CreateActivityLogCommand request,
        CancellationToken cancellationToken)
    {
        var activityLog = new ActivityLog(
            request.UserId,
            request.UserName,
            request.Action,
            request.ModuleName,
            request.EntityName,
            request.EntityId,
            request.Description,
            request.OldValues,
            request.NewValues,
            request.IpAddress,
            request.UserAgent,
            request.Status);

        await _context.ActivityLogs.AddAsync(activityLog, cancellationToken);

        await _context.SaveChangesAsync(cancellationToken);

        return new ActivityLogDto
        {
            Id = activityLog.Id,
            UserId = activityLog.UserId,
            UserName = activityLog.UserName,
            Action = activityLog.Action,
            ModuleName = activityLog.ModuleName,
            EntityName = activityLog.EntityName,
            EntityId = activityLog.EntityId,
            Description = activityLog.Description,
            OldValues = activityLog.OldValues,
            NewValues = activityLog.NewValues,
            IpAddress = activityLog.IpAddress,
            UserAgent = activityLog.UserAgent,
            Status = activityLog.Status,
            CreatedAt = activityLog.CreatedAt
        };
    }
}