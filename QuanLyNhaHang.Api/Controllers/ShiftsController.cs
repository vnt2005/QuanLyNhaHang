using MediatR;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using QuanLyNhaHang.Application.Features.Shifts.Commands.Create;
using QuanLyNhaHang.Application.Features.Shifts.Commands.Delete;
using QuanLyNhaHang.Application.Features.Shifts.Commands.Update;
using QuanLyNhaHang.Application.Features.Shifts.Queries.GetById;
using QuanLyNhaHang.Application.Features.Shifts.Queries.GetList;
using QuanLyNhaHang.Application.Features.Shifts.Queries.GetWithPaginatedList;

namespace QuanLyNhaHang.Api.Controllers;

[Route("api/[controller]")]
[ApiController]
[Authorize(Roles = "Admin")]
public class ShiftsController : ControllerBase
{
    private readonly IMediator _mediator;

    public ShiftsController(IMediator mediator)
    {
        _mediator = mediator;
    }

    // GET: api/shifts
    [HttpGet]
    public async Task<IActionResult> GetList(CancellationToken cancellationToken)
    {
        var result = await _mediator.Send(
            new GetShiftListQuery(),
            cancellationToken);

        return Ok(result);
    }

    // GET: api/shifts/paginated?keyword=ca&pageNumber=1&pageSize=10
    [HttpGet("paginated")]
    public async Task<IActionResult> GetWithPaginatedList(
        [FromQuery] string? keyword,
        [FromQuery] int pageNumber = 1,
        [FromQuery] int pageSize = 10,
        CancellationToken cancellationToken = default)
    {
        var query = new GetShiftsWithPaginatedListQuery
        {
            Keyword = keyword,
            PageNumber = pageNumber,
            PageSize = pageSize
        };

        var result = await _mediator.Send(query, cancellationToken);

        return Ok(result);
    }

    // GET: api/shifts/{id}
    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetById(
        Guid id,
        CancellationToken cancellationToken)
    {
        var result = await _mediator.Send(
            new GetShiftByIdQuery(id),
            cancellationToken);

        if (result == null)
        {
            return NotFound(new
            {
                Message = "Không tìm thấy ca làm việc."
            });
        }

        return Ok(result);
    }

    // POST: api/shifts
    [HttpPost]
    public async Task<IActionResult> Create(
        [FromBody] CreateShiftCommand command,
        CancellationToken cancellationToken)
    {
        var id = await _mediator.Send(command, cancellationToken);

        return CreatedAtAction(
            nameof(GetById),
            new { id },
            new
            {
                Id = id,
                Message = "Tạo ca làm việc thành công."
            });
    }

    // PUT: api/shifts/{id}
    [HttpPut("{id:guid}")]
    public async Task<IActionResult> Update(
        Guid id,
        [FromBody] UpdateShiftCommand command,
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
                Message = "Cập nhật ca làm việc thất bại."
            });
        }

        return Ok(new
        {
            Message = "Cập nhật ca làm việc thành công."
        });
    }

    // DELETE: api/shifts/{id}
    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(
        Guid id,
        CancellationToken cancellationToken)
    {
        var result = await _mediator.Send(
            new DeleteShiftCommand(id),
            cancellationToken);

        if (!result)
        {
            return BadRequest(new
            {
                Message = "Xóa ca làm việc thất bại."
            });
        }

        return Ok(new
        {
            Message = "Xóa ca làm việc thành công."
        });
    }
}