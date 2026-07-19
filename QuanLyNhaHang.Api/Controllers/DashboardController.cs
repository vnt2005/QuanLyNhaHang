using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using QuanLyNhaHang.Application.Common.Constants;
using QuanLyNhaHang.Application.Features.Dashboard.Queries.GetDashboard;

namespace QuanLyNhaHang.Api.Controllers;

[Route("api/[controller]")]
[ApiController]
[Authorize]
public class DashboardController : ControllerBase
{
    private readonly IMediator _mediator;

    public DashboardController(IMediator mediator)
    {
        _mediator = mediator;
    }

    [HttpGet]
    [HasPermission(PermissionCodes.DashboardView)]
    public async Task<IActionResult> GetDashboard(
        [FromQuery] DateTime? fromDate,
        [FromQuery] DateTime? toDate,
        [FromQuery] int top = 5,
        CancellationToken cancellationToken = default)
    {
        var query = new GetDashboardQuery
        {
            FromDate = fromDate,
            ToDate = toDate,
            Top = top
        };

        var result = await _mediator.Send(query, cancellationToken);

        return Ok(result);
    }
}
