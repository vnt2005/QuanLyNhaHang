using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using QuanLyNhaHang.Application.Common.Constants;
using QuanLyNhaHang.Application.Features.ActivityLogs.Commands.Create;
using QuanLyNhaHang.Application.Features.ActivityLogs.Commands.Delete;
using QuanLyNhaHang.Application.Features.ActivityLogs.Queries.GetById;
using QuanLyNhaHang.Application.Features.ActivityLogs.Queries.GetList;
using QuanLyNhaHang.Application.Features.ActivityLogs.Queries.GetSummary;
using QuanLyNhaHang.Application.Features.ActivityLogs.Queries.GetWithPaginatedList;

namespace QuanLyNhaHang.Api.Controllers;

[ApiController]
[Route("api/activity-logs")]
[Authorize]
public class ActivityLogsController : ControllerBase
{
    private readonly IMediator _mediator;

    public ActivityLogsController(IMediator mediator)
    {
        _mediator = mediator;
    }

    [HttpGet]
    [HasPermission(PermissionCodes.ActivityLogsView)]
    public async Task<IActionResult> GetList(
        [FromQuery] Guid? userId,
        [FromQuery] string? action,
        [FromQuery] string? moduleName,
        [FromQuery] string? entityName,
        [FromQuery] Guid? entityId,
        [FromQuery] string? status,
        [FromQuery] DateTime? fromDate,
        [FromQuery] DateTime? toDate)
    {
        var result = await _mediator.Send(new GetActivityLogsQuery
        {
            UserId = userId,
            Action = action,
            ModuleName = moduleName,
            EntityName = entityName,
            EntityId = entityId,
            Status = status,
            FromDate = fromDate,
            ToDate = toDate
        });

        return Ok(result);
    }

    [HttpGet("summary")]
    [HasPermission(PermissionCodes.ActivityLogsView)]
    public async Task<IActionResult> GetSummary(
        [FromQuery] Guid? userId,
        [FromQuery] string? moduleName,
        [FromQuery] DateTime? fromDate,
        [FromQuery] DateTime? toDate)
    {
        var result = await _mediator.Send(new GetActivityLogSummaryQuery
        {
            UserId = userId,
            ModuleName = moduleName,
            FromDate = fromDate,
            ToDate = toDate
        });

        return Ok(result);
    }

    [HttpGet("paginated")]
    [HasPermission(PermissionCodes.ActivityLogsView)]
    public async Task<IActionResult> GetWithPaginatedList(
        [FromQuery] string? keyword,
        [FromQuery] Guid? userId,
        [FromQuery] string? action,
        [FromQuery] string? moduleName,
        [FromQuery] string? entityName,
        [FromQuery] Guid? entityId,
        [FromQuery] string? status,
        [FromQuery] DateTime? fromDate,
        [FromQuery] DateTime? toDate,
        [FromQuery] int pageNumber = 1,
        [FromQuery] int pageSize = 10)
    {
        var result = await _mediator.Send(new GetActivityLogsWithPaginatedListQuery
        {
            Keyword = keyword,
            UserId = userId,
            Action = action,
            ModuleName = moduleName,
            EntityName = entityName,
            EntityId = entityId,
            Status = status,
            FromDate = fromDate,
            ToDate = toDate,
            PageNumber = pageNumber,
            PageSize = pageSize
        });

        return Ok(result);
    }

    [HttpGet("{id:guid}")]
    [HasPermission(PermissionCodes.ActivityLogsView)]
    public async Task<IActionResult> GetById(Guid id)
    {
        var result = await _mediator.Send(new GetActivityLogByIdQuery
        {
            Id = id
        });

        if (result == null)
            return NotFound(new
            {
                message = "Không tìm thấy nhật ký hoạt động."
            });

        return Ok(result);
    }

    [HttpPost]
    [HasPermission(PermissionCodes.ActivityLogsCreate)]
    public async Task<IActionResult> Create([FromBody] CreateActivityLogCommand command)
    {
        var result = await _mediator.Send(command);

        return Ok(new
        {
            success = true,
            message = "Tạo nhật ký hoạt động thành công.",
            data = result
        });
    }

    [HttpDelete("{id:guid}")]
    [HasPermission(PermissionCodes.ActivityLogsDelete)]
    public async Task<IActionResult> Delete(Guid id)
    {
        var result = await _mediator.Send(new DeleteActivityLogCommand
        {
            Id = id
        });

        return Ok(new
        {
            success = result,
            message = "Xóa nhật ký hoạt động thành công."
        });
    }
}
