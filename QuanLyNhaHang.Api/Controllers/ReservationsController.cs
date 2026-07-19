using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using QuanLyNhaHang.Application.Common.Constants;
using QuanLyNhaHang.Application.Features.Reservations.Commands.Create;
using QuanLyNhaHang.Application.Features.Reservations.Commands.Delete;
using QuanLyNhaHang.Application.Features.Reservations.Commands.Update;
using QuanLyNhaHang.Application.Features.Reservations.Queries.GetById;
using QuanLyNhaHang.Application.Features.Reservations.Queries.GetList;
using QuanLyNhaHang.Application.Features.Reservations.Queries.GetWithPaginatedList;

namespace QuanLyNhaHang.Api.Controllers;

[ApiController]
[Route("api/reservations")]
[Authorize]
public class ReservationsController : ControllerBase
{
    private readonly IMediator _mediator;

    public ReservationsController(IMediator mediator)
    {
        _mediator = mediator;
    }

    [HttpGet]
    [HasPermission(PermissionCodes.ReservationsView)]
    public async Task<IActionResult> GetList(
        [FromQuery] string? status,
        [FromQuery] DateTime? fromDate,
        [FromQuery] DateTime? toDate)
    {
        var result = await _mediator.Send(new GetReservationsQuery
        {
            Status = status,
            FromDate = fromDate,
            ToDate = toDate
        });

        return Ok(result);
    }

    [HttpGet("{id:guid}")]
    [HasPermission(PermissionCodes.ReservationsView)]
    public async Task<IActionResult> GetById(Guid id)
    {
        var result = await _mediator.Send(new GetReservationByIdQuery
        {
            Id = id
        });

        if (result == null)
            return NotFound(new
            {
                message = "Không tìm thấy đặt bàn."
            });

        return Ok(result);
    }

    [HttpGet("paginated")]
    [HasPermission(PermissionCodes.ReservationsView)]
    public async Task<IActionResult> GetWithPaginatedList(
        [FromQuery] string? keyword,
        [FromQuery] string? status,
        [FromQuery] DateTime? fromDate,
        [FromQuery] DateTime? toDate,
        [FromQuery] int pageNumber = 1,
        [FromQuery] int pageSize = 10)
    {
        var result = await _mediator.Send(new GetReservationsWithPaginatedListQuery
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

    [HttpPost]
    [HasPermission(PermissionCodes.ReservationsCreate)]
    public async Task<IActionResult> Create([FromBody] CreateReservationCommand command)
    {
        var result = await _mediator.Send(command);

        return Ok(new
        {
            success = true,
            message = "Tạo đặt bàn thành công.",
            data = result
        });
    }

    [HttpPut("{id:guid}")]
    [HasPermission(PermissionCodes.ReservationsUpdate)]
    public async Task<IActionResult> Update(
        Guid id,
        [FromBody] UpdateReservationCommand command)
    {
        command.Id = id;

        var result = await _mediator.Send(command);

        return Ok(new
        {
            success = true,
            message = "Cập nhật đặt bàn thành công.",
            data = result
        });
    }

    [HttpPatch("{id:guid}/status")]
    [HasPermission(PermissionCodes.ReservationsUpdate)]
    public async Task<IActionResult> UpdateStatus(
        Guid id,
        [FromBody] UpdateReservationStatusCommand command)
    {
        command.Id = id;

        var result = await _mediator.Send(command);

        return Ok(new
        {
            success = true,
            message = "Cập nhật trạng thái đặt bàn thành công.",
            data = result
        });
    }

    [HttpDelete("{id:guid}")]
    [HasPermission(PermissionCodes.ReservationsCancel)]
    public async Task<IActionResult> Delete(Guid id)
    {
        var result = await _mediator.Send(new DeleteReservationCommand
        {
            Id = id
        });

        return Ok(new
        {
            success = result,
            message = "Hủy đặt bàn thành công."
        });
    }
}