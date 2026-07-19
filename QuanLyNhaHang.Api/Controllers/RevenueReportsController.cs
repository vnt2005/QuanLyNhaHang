using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using QuanLyNhaHang.Application.Common.Constants;
using QuanLyNhaHang.Application.Features.RevenueReports.Commands.Create;
using QuanLyNhaHang.Application.Features.RevenueReports.Commands.Delete;
using QuanLyNhaHang.Application.Features.RevenueReports.Commands.Update;
using QuanLyNhaHang.Application.Features.RevenueReports.Queries.GetById;
using QuanLyNhaHang.Application.Features.RevenueReports.Queries.GetList;
using QuanLyNhaHang.Application.Features.RevenueReports.Queries.GetSummary;
using QuanLyNhaHang.Application.Features.RevenueReports.Queries.GetWithPaginatedList;

namespace QuanLyNhaHang.Api.Controllers;

[ApiController]
[Route("api/revenue-reports")]
[Authorize]
public class RevenueReportsController : ControllerBase
{
    private readonly IMediator _mediator;

    public RevenueReportsController(IMediator mediator)
    {
        _mediator = mediator;
    }

    [HttpGet]
    [HasPermission(PermissionCodes.RevenueReportsView)]
    public async Task<IActionResult> GetList([FromQuery] string? status)
    {
        var result = await _mediator.Send(new GetRevenueReportsQuery
        {
            Status = status
        });

        return Ok(result);
    }

    [HttpGet("{id:guid}")]
    [HasPermission(PermissionCodes.RevenueReportsView)]
    public async Task<IActionResult> GetById(Guid id)
    {
        var result = await _mediator.Send(new GetRevenueReportByIdQuery
        {
            Id = id
        });

        if (result == null)
            return NotFound(new
            {
                message = "Không tìm thấy báo cáo doanh thu."
            });

        return Ok(result);
    }

    [HttpGet("paginated")]
    [HasPermission(PermissionCodes.RevenueReportsView)]
    public async Task<IActionResult> GetWithPaginatedList(
        [FromQuery] string? keyword,
        [FromQuery] string? status,
        [FromQuery] DateTime? fromDate,
        [FromQuery] DateTime? toDate,
        [FromQuery] int pageNumber = 1,
        [FromQuery] int pageSize = 10)
    {
        var result = await _mediator.Send(new GetRevenueReportsWithPaginatedListQuery
        {
            Keyword = keyword,
            Status = status,
            FromDate = fromDate,
            ToDate = toDate,
            PageNumber = pageNumber,
            PageSize = pageSize
        });

        return Ok(result);
    }

    [HttpGet("summary")]
    [HasPermission(PermissionCodes.RevenueReportsView)]
    public async Task<IActionResult> GetSummary(
        [FromQuery] DateTime? fromDate,
        [FromQuery] DateTime? toDate)
    {
        var result = await _mediator.Send(new GetRevenueReportSummaryQuery
        {
            FromDate = fromDate,
            ToDate = toDate
        });

        return Ok(result);
    }

    [HttpPost]
    [HasPermission(PermissionCodes.RevenueReportsManage)]
    public async Task<IActionResult> Create([FromBody] CreateRevenueReportCommand command)
    {
        var result = await _mediator.Send(command);

        return Ok(new
        {
            success = true,
            message = "Tạo báo cáo doanh thu thành công.",
            data = result
        });
    }

    [HttpPut("{id:guid}")]
    [HasPermission(PermissionCodes.RevenueReportsManage)]
    public async Task<IActionResult> Update(
        Guid id,
        [FromBody] UpdateRevenueReportCommand command)
    {
        command.Id = id;

        var result = await _mediator.Send(command);

        return Ok(new
        {
            success = true,
            message = "Cập nhật báo cáo doanh thu thành công.",
            data = result
        });
    }

    [HttpDelete("{id:guid}")]
    [HasPermission(PermissionCodes.RevenueReportsManage)]
    public async Task<IActionResult> Delete(Guid id)
    {
        var result = await _mediator.Send(new DeleteRevenueReportCommand
        {
            Id = id
        });

        return Ok(new
        {
            success = result,
            message = "Hủy báo cáo doanh thu thành công."
        });
    }
}
