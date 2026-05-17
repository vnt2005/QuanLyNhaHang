using MediatR;
using Microsoft.AspNetCore.Mvc;
using QuanLyNhaHang.Application.Features.Employees.Commands.Create;
using QuanLyNhaHang.Application.Features.Employees.Commands.Delete;
using QuanLyNhaHang.Application.Features.Employees.Commands.Update;
using QuanLyNhaHang.Application.Features.Employees.Queries.GetById;
using QuanLyNhaHang.Application.Features.Employees.Queries.GetList;
using QuanLyNhaHang.Application.Features.Employees.Queries.GetWithPaginatedList;

namespace QuanLyNhaHang.Api.Controllers;

[Route("api/[controller]")]
[ApiController]
public class EmployeesController : ControllerBase
{
    private readonly IMediator _mediator;

    public EmployeesController(IMediator mediator)
    {
        _mediator = mediator;
    }

    // GET: api/employees
    [HttpGet]
    public async Task<IActionResult> GetList(CancellationToken cancellationToken)
    {
        var result = await _mediator.Send(
            new GetEmployeeListQuery(),
            cancellationToken);

        return Ok(result);
    }

    // GET: api/employees/paginated?keyword=a&pageNumber=1&pageSize=10
    [HttpGet("paginated")]
    public async Task<IActionResult> GetWithPaginatedList(
        [FromQuery] string? keyword,
        [FromQuery] int pageNumber = 1,
        [FromQuery] int pageSize = 10,
        CancellationToken cancellationToken = default)
    {
        var query = new GetEmployeesWithPaginatedListQuery
        {
            Keyword = keyword,
            PageNumber = pageNumber,
            PageSize = pageSize
        };

        var result = await _mediator.Send(query, cancellationToken);

        return Ok(result);
    }

    // GET: api/employees/{id}
    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetById(
        Guid id,
        CancellationToken cancellationToken)
    {
        var result = await _mediator.Send(
            new GetEmployeeByIdQuery(id),
            cancellationToken);

        if (result == null)
        {
            return NotFound(new
            {
                Message = "Không tìm thấy nhân viên."
            });
        }

        return Ok(result);
    }

    // POST: api/employees
    [HttpPost]
    public async Task<IActionResult> Create(
        [FromBody] CreateEmployeeCommand command,
        CancellationToken cancellationToken)
    {
        var id = await _mediator.Send(command, cancellationToken);

        return CreatedAtAction(
            nameof(GetById),
            new { id },
            new
            {
                Id = id,
                Message = "Tạo nhân viên thành công."
            });
    }

    // PUT: api/employees/{id}
    [HttpPut("{id:guid}")]
    public async Task<IActionResult> Update(
        Guid id,
        [FromBody] UpdateEmployeeCommand command,
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
                Message = "Cập nhật nhân viên thất bại."
            });
        }

        return Ok(new
        {
            Message = "Cập nhật nhân viên thành công."
        });
    }

    // DELETE: api/employees/{id}
    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(
        Guid id,
        CancellationToken cancellationToken)
    {
        var result = await _mediator.Send(
            new DeleteEmployeeCommand(id),
            cancellationToken);

        if (!result)
        {
            return BadRequest(new
            {
                Message = "Xóa nhân viên thất bại."
            });
        }

        return Ok(new
        {
            Message = "Xóa nhân viên thành công."
        });
    }
}