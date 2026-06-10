using MediatR;
using Microsoft.AspNetCore.Mvc;
using QuanLyNhaHang.Application.Features.InventoryTransactions.Commands.Create;
using QuanLyNhaHang.Application.Features.InventoryTransactions.Commands.Delete;
using QuanLyNhaHang.Application.Features.InventoryTransactions.Queries.GetById;
using QuanLyNhaHang.Application.Features.InventoryTransactions.Queries.GetList;
using QuanLyNhaHang.Application.Features.InventoryTransactions.Queries.GetWithPaginatedList;

namespace QuanLyNhaHang.Api.Controllers;

[ApiController]
[Route("api/inventory-transactions")]
public class InventoryTransactionsController : ControllerBase
{
    private readonly IMediator _mediator;

    public InventoryTransactionsController(IMediator mediator)
    {
        _mediator = mediator;
    }

    [HttpGet]
    public async Task<IActionResult> GetList(
        [FromQuery] Guid? ingredientId,
        [FromQuery] string? transactionType,
        [FromQuery] string? status,
        [FromQuery] DateTime? fromDate,
        [FromQuery] DateTime? toDate)
    {
        var result = await _mediator.Send(new GetInventoryTransactionsQuery
        {
            IngredientId = ingredientId,
            TransactionType = transactionType,
            Status = status,
            FromDate = fromDate,
            ToDate = toDate
        });

        return Ok(result);
    }

    [HttpGet("paginated")]
    public async Task<IActionResult> GetWithPaginatedList(
        [FromQuery] string? keyword,
        [FromQuery] Guid? ingredientId,
        [FromQuery] string? transactionType,
        [FromQuery] string? status,
        [FromQuery] DateTime? fromDate,
        [FromQuery] DateTime? toDate,
        [FromQuery] int pageNumber = 1,
        [FromQuery] int pageSize = 10)
    {
        var result = await _mediator.Send(new GetInventoryTransactionsWithPaginatedListQuery
        {
            Keyword = keyword,
            IngredientId = ingredientId,
            TransactionType = transactionType,
            Status = status,
            FromDate = fromDate,
            ToDate = toDate,
            PageNumber = pageNumber,
            PageSize = pageSize
        });

        return Ok(result);
    }

    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetById(Guid id)
    {
        var result = await _mediator.Send(new GetInventoryTransactionByIdQuery
        {
            Id = id
        });

        if (result == null)
            return NotFound(new
            {
                message = "Không tìm thấy giao dịch tồn kho."
            });

        return Ok(result);
    }

    [HttpPost("import")]
    public async Task<IActionResult> Import([FromBody] ImportInventoryTransactionCommand command)
    {
        var result = await _mediator.Send(command);

        return Ok(new
        {
            success = true,
            message = "Nhập kho nguyên liệu thành công.",
            data = result
        });
    }

    [HttpPost("export")]
    public async Task<IActionResult> Export([FromBody] ExportInventoryTransactionCommand command)
    {
        var result = await _mediator.Send(command);

        return Ok(new
        {
            success = true,
            message = "Xuất kho nguyên liệu thành công.",
            data = result
        });
    }

    [HttpPost("adjust")]
    public async Task<IActionResult> Adjust([FromBody] AdjustInventoryTransactionCommand command)
    {
        var result = await _mediator.Send(command);

        return Ok(new
        {
            success = true,
            message = "Điều chỉnh tồn kho nguyên liệu thành công.",
            data = result
        });
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Cancel(Guid id)
    {
        var result = await _mediator.Send(new CancelInventoryTransactionCommand
        {
            Id = id
        });

        return Ok(new
        {
            success = result,
            message = "Hủy giao dịch tồn kho thành công."
        });
    }
}