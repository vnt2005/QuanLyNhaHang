using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using QuanLyNhaHang.Application.Common.Constants;
using QuanLyNhaHang.Application.Features.EmployeeShifts.Commands.Create;
using QuanLyNhaHang.Application.Features.EmployeeShifts.Commands.Delete;
using QuanLyNhaHang.Application.Features.EmployeeShifts.Commands.Update;
using QuanLyNhaHang.Application.Features.EmployeeShifts.Queries.GetById;
using QuanLyNhaHang.Application.Features.EmployeeShifts.Queries.GetList;
using QuanLyNhaHang.Application.Features.EmployeeShifts.Queries.GetWithPaginatedList;

namespace QuanLyNhaHang.Api.Controllers;

[Route("api/[controller]")]
[ApiController]
[Authorize]
public class EmployeeShiftsController : ControllerBase
{
    private readonly IMediator _mediator;

    public EmployeeShiftsController(IMediator mediator)
    {
        _mediator = mediator;
    }

    [HttpGet]
    [HasPermission(PermissionCodes.EmployeeShiftsView)]
    public async Task<IActionResult> GetList(CancellationToken cancellationToken)
    {
        var result = await _mediator.Send(
            new GetEmployeeShiftListQuery(),
            cancellationToken);

        return Ok(result);
    }

    [HttpGet("paginated")]
    [HasPermission(PermissionCodes.EmployeeShiftsView)]
    public async Task<IActionResult> GetWithPaginatedList(
        [FromQuery] string? keyword,
        [FromQuery] DateTime? workDate,
        [FromQuery] Guid? employeeId,
        [FromQuery] Guid? shiftId,
        [FromQuery] int pageNumber = 1,
        [FromQuery] int pageSize = 10,
        CancellationToken cancellationToken = default)
    {
        var query = new GetEmployeeShiftsWithPaginatedListQuery
        {
            Keyword = keyword,
            WorkDate = workDate,
            EmployeeId = employeeId,
            ShiftId = shiftId,
            PageNumber = pageNumber,
            PageSize = pageSize
        };

        var result = await _mediator.Send(query, cancellationToken);

        return Ok(result);
    }

    [HttpGet("{id:guid}")]
    [HasPermission(PermissionCodes.EmployeeShiftsView)]
    public async Task<IActionResult> GetById(
        Guid id,
        CancellationToken cancellationToken)
    {
        var result = await _mediator.Send(
            new GetEmployeeShiftByIdQuery(id),
            cancellationToken);

        if (result == null)
        {
            return NotFound(new
            {
                Message = "Không tìm thấy phân công ca."
            });
        }

        return Ok(result);
    }

    [HttpPost]
    [HasPermission(PermissionCodes.EmployeeShiftsManage)]
    public async Task<IActionResult> Create(
        [FromBody] CreateEmployeeShiftCommand command,
        CancellationToken cancellationToken)
    {
        var id = await _mediator.Send(command, cancellationToken);

        return CreatedAtAction(
            nameof(GetById),
            new { id },
            new
            {
                Id = id,
                Message = "Phân công ca thành công."
            });
    }

    [HttpPut("{id:guid}")]
    [HasPermission(PermissionCodes.EmployeeShiftsManage)]
    public async Task<IActionResult> Update(
        Guid id,
        [FromBody] UpdateEmployeeShiftCommand command,
        CancellationToken cancellationToken)
    {
        if (id != command.Id)
        {
            return BadRequest(new
            {
                Message = "Id trên URL không khớp với Id trong body."
            });
        }

        var result = await _mediator.Send(command, cancellationToken);

        if (!result)
        {
            return BadRequest(new
            {
                Message = "Cập nhật phân công ca thất bại."
            });
        }

        return Ok(new
        {
            Message = "Cập nhật phân công ca thành công."
        });
    }

    [HttpDelete("{id:guid}")]
    [HasPermission(PermissionCodes.EmployeeShiftsManage)]
    public async Task<IActionResult> Delete(
        Guid id,
        CancellationToken cancellationToken)
    {
        var result = await _mediator.Send(
            new DeleteEmployeeShiftCommand(id),
            cancellationToken);

        if (!result)
        {
            return BadRequest(new
            {
                Message = "Xóa phân công ca thất bại."
            });
        }

        return Ok(new
        {
            Message = "Xóa phân công ca thành công."
        });
    }
}
