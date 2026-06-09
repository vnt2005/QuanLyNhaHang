using MediatR;
using Microsoft.AspNetCore.Mvc;
using QuanLyNhaHang.Application.Features.TableOperations.Commands.Create;
using QuanLyNhaHang.Application.Features.TableOperations.Commands.Delete;
using QuanLyNhaHang.Application.Features.TableOperations.Commands.Update;
using QuanLyNhaHang.Application.Features.TableOperations.Queries.GetById;
using QuanLyNhaHang.Application.Features.TableOperations.Queries.GetList;
using QuanLyNhaHang.Application.Features.TableOperations.Queries.GetWithPaginatedList;

namespace QuanLyNhaHang.Api.Controllers;

[ApiController]
[Route("api/table-operations")]
public class TableOperationsController : ControllerBase
{
    private readonly IMediator _mediator;

    public TableOperationsController(IMediator mediator)
    {
        _mediator = mediator;
    }

    [HttpGet]
    public async Task<IActionResult> GetList(
        [FromQuery] string? operationType,
        [FromQuery] string? status)
    {
        var result = await _mediator.Send(new GetTableOperationsQuery
        {
            OperationType = operationType,
            Status = status
        });

        return Ok(result);
    }

    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetById(Guid id)
    {
        var result = await _mediator.Send(new GetTableOperationByIdQuery
        {
            Id = id
        });

        if (result == null)
            return NotFound(new
            {
                message = "Không tìm thấy thao tác bàn."
            });

        return Ok(result);
    }

    [HttpGet("paginated")]
    public async Task<IActionResult> GetWithPaginatedList(
        [FromQuery] string? keyword,
        [FromQuery] string? operationType,
        [FromQuery] string? status,
        [FromQuery] int pageNumber = 1,
        [FromQuery] int pageSize = 10)
    {
        var result = await _mediator.Send(new GetTableOperationsWithPaginatedListQuery
        {
            Keyword = keyword,
            OperationType = operationType,
            Status = status,
            PageNumber = pageNumber,
            PageSize = pageSize
        });

        return Ok(result);
    }

    [HttpPost("transfer")]
    public async Task<IActionResult> TransferTable([FromBody] TransferTableCommand command)
    {
        var result = await _mediator.Send(command);

        return Ok(new
        {
            success = true,
            message = "Chuyển bàn thành công.",
            data = result
        });
    }

    [HttpPost("merge")]
    public async Task<IActionResult> MergeTables([FromBody] MergeTablesCommand command)
    {
        var result = await _mediator.Send(command);

        return Ok(new
        {
            success = true,
            message = "Gộp bàn thành công.",
            data = result
        });
    }

    [HttpPost("split")]
    public async Task<IActionResult> SplitTable([FromBody] SplitTableCommand command)
    {
        var result = await _mediator.Send(command);

        return Ok(new
        {
            success = true,
            message = "Tách bàn thành công.",
            data = result
        });
    }

    [HttpPut("{id:guid}")]
    public async Task<IActionResult> Update(
        Guid id,
        [FromBody] UpdateTableOperationCommand command)
    {
        command.Id = id;

        var result = await _mediator.Send(command);

        return Ok(new
        {
            success = true,
            message = "Cập nhật thao tác bàn thành công.",
            data = result
        });
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id)
    {
        var result = await _mediator.Send(new DeleteTableOperationCommand
        {
            Id = id
        });

        return Ok(new
        {
            success = result,
            message = "Hủy lịch sử thao tác bàn thành công."
        });
    }
}