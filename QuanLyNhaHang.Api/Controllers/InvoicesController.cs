using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using QuanLyNhaHang.Application.Common.Constants;
using QuanLyNhaHang.Application.Features.Invoices.Commands.Create;
using QuanLyNhaHang.Application.Features.Invoices.Commands.Delete;
using QuanLyNhaHang.Application.Features.Invoices.Commands.Update;
using QuanLyNhaHang.Application.Features.Invoices.Queries.GetById;
using QuanLyNhaHang.Application.Features.Invoices.Queries.GetList;
using QuanLyNhaHang.Application.Features.Invoices.Queries.GetWithPaginatedList;

namespace QuanLyNhaHang.Api.Controllers;

[ApiController]
[Route("api/invoices")]
[Authorize]
public class InvoicesController : ControllerBase
{
    private readonly IMediator _mediator;

    public InvoicesController(IMediator mediator)
    {
        _mediator = mediator;
    }

    [HttpGet]
    [HasPermission(PermissionCodes.InvoicesView)]
    public async Task<IActionResult> GetList(
        [FromQuery] string? status,
        [FromQuery] string? paymentMethod)
    {
        var result = await _mediator.Send(new GetInvoicesQuery
        {
            Status = status,
            PaymentMethod = paymentMethod
        });

        return Ok(result);
    }

    [HttpGet("{id:guid}")]
    [HasPermission(PermissionCodes.InvoicesView)]
    public async Task<IActionResult> GetById(Guid id)
    {
        var result = await _mediator.Send(new GetInvoiceByIdQuery
        {
            Id = id
        });

        if (result == null)
            return NotFound(new { message = "Không tìm thấy hóa đơn." });

        return Ok(result);
    }

    [HttpGet("paginated")]
    [HasPermission(PermissionCodes.InvoicesView)]
    public async Task<IActionResult> GetWithPaginatedList(
        [FromQuery] string? keyword,
        [FromQuery] string? status,
        [FromQuery] string? paymentMethod,
        [FromQuery] int pageNumber = 1,
        [FromQuery] int pageSize = 10)
    {
        var result = await _mediator.Send(new GetInvoicesWithPaginatedListQuery
        {
            Keyword = keyword,
            Status = status,
            PaymentMethod = paymentMethod,
            PageNumber = pageNumber,
            PageSize = pageSize
        });

        return Ok(result);
    }

    [HttpPost]
    [HasPermission(PermissionCodes.InvoicesManage)]
    public async Task<IActionResult> Create([FromBody] CreateInvoiceCommand command)
    {
        var result = await _mediator.Send(command);

        return Ok(new
        {
            success = true,
            message = "Tạo hóa đơn thành công.",
            data = result
        });
    }

    [HttpPut("{id:guid}")]
    [HasPermission(PermissionCodes.InvoicesManage)]
    public async Task<IActionResult> Update(
        Guid id,
        [FromBody] UpdateInvoiceCommand command)
    {
        command.Id = id;

        var result = await _mediator.Send(command);

        return Ok(new
        {
            success = true,
            message = "Cập nhật hóa đơn thành công.",
            data = result
        });
    }

    [HttpDelete("{id:guid}")]
    [HasPermission(PermissionCodes.InvoicesManage)]
    public async Task<IActionResult> Delete(Guid id)
    {
        var result = await _mediator.Send(new DeleteInvoiceCommand
        {
            Id = id
        });

        return Ok(new
        {
            success = result,
            message = "Hủy hóa đơn thành công."
        });
    }
}
