using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using QuanLyNhaHang.Application.Features.Areas.Commands.Create;
using QuanLyNhaHang.Application.Features.Areas.Commands.Delete;
using QuanLyNhaHang.Application.Features.Areas.Commands.Update;
using QuanLyNhaHang.Application.Features.Areas.Queries.GetById;
using QuanLyNhaHang.Application.Features.Areas.Queries.GetList;
using QuanLyNhaHang.Application.Features.Areas.Queries.GetWithPaginatedList;

namespace QuanLyNhaHang.Api.Controllers;

[Route("api/[controller]")]
[ApiController]
[Authorize(Roles = "Admin")]
public class AreasController : ControllerBase
{
    private readonly IMediator _mediator;

    public AreasController(IMediator mediator)
    {
        _mediator = mediator;
    }

    // GET: api/areas
    [HttpGet]
    public async Task<IActionResult> GetList(CancellationToken cancellationToken)
    {
        var result = await _mediator.Send(
            new GetAreaListQuery(),
            cancellationToken);

        return Ok(result);
    }

    // GET: api/areas/paginated?keyword=tang&pageNumber=1&pageSize=10
    [HttpGet("paginated")]
    public async Task<IActionResult> GetWithPaginatedList(
        [FromQuery] string? keyword,
        [FromQuery] int pageNumber = 1,
        [FromQuery] int pageSize = 10,
        CancellationToken cancellationToken = default)
    {
        var query = new GetAreasWithPaginatedListQuery
        {
            Keyword = keyword,
            PageNumber = pageNumber,
            PageSize = pageSize
        };

        var result = await _mediator.Send(query, cancellationToken);

        return Ok(result);
    }

    // GET: api/areas/{id}
    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetById(
        Guid id,
        CancellationToken cancellationToken)
    {
        var result = await _mediator.Send(
            new GetAreaByIdQuery(id),
            cancellationToken);

        if (result == null)
        {
            return NotFound(new
            {
                Message = "Không tìm thấy khu vực."
            });
        }

        return Ok(result);
    }

    // POST: api/areas
    [HttpPost]
    public async Task<IActionResult> Create(
        [FromBody] CreateAreaCommand command,
        CancellationToken cancellationToken)
    {
        var id = await _mediator.Send(command, cancellationToken);

        return CreatedAtAction(
            nameof(GetById),
            new { id },
            new
            {
                Id = id,
                Message = "Tạo khu vực thành công."
            });
    }

    // PUT: api/areas/{id}
    [HttpPut("{id:guid}")]
    public async Task<IActionResult> Update(
        Guid id,
        [FromBody] UpdateAreaCommand command,
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
                Message = "Cập nhật khu vực thất bại."
            });
        }

        return Ok(new
        {
            Message = "Cập nhật khu vực thành công."
        });
    }

    // DELETE: api/areas/{id}
    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(
        Guid id,
        CancellationToken cancellationToken)
    {
        var result = await _mediator.Send(
            new DeleteAreaCommand(id),
            cancellationToken);

        if (!result)
        {
            return BadRequest(new
            {
                Message = "Xóa khu vực thất bại."
            });
        }

        return Ok(new
        {
            Message = "Xóa khu vực thành công."
        });
    }
}