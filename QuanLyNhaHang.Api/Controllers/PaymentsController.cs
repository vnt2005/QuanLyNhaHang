using MediatR;
using Microsoft.AspNetCore.Mvc;
using QuanLyNhaHang.Application.Features.Payments.Commands.Create;
using QuanLyNhaHang.Application.Features.Payments.Commands.Delete;
using QuanLyNhaHang.Application.Features.Payments.Commands.Update;
using QuanLyNhaHang.Application.Features.Payments.Queries.GetById;
using QuanLyNhaHang.Application.Features.Payments.Queries.GetList;
using QuanLyNhaHang.Application.Features.Payments.Queries.GetWithPaginatedList;

namespace QuanLyNhaHang.Api.Controllers;

[ApiController]
[Route("api/payments")]
public class PaymentsController : ControllerBase
{
    private readonly IMediator _mediator;

    public PaymentsController(IMediator mediator)
    {
        _mediator = mediator;
    }

    [HttpGet]
    public async Task<IActionResult> GetList(
        [FromQuery] string? status,
        [FromQuery] string? paymentMethod)
    {
        var result = await _mediator.Send(new GetPaymentsQuery
        {
            Status = status,
            PaymentMethod = paymentMethod
        });

        return Ok(result);
    }

    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetById(Guid id)
    {
        var result = await _mediator.Send(new GetPaymentByIdQuery
        {
            Id = id
        });

        if (result == null)
            return NotFound(new
            {
                message = "Không tìm thấy thanh toán."
            });

        return Ok(result);
    }

    [HttpGet("paginated")]
    public async Task<IActionResult> GetWithPaginatedList(
        [FromQuery] string? keyword,
        [FromQuery] string? status,
        [FromQuery] string? paymentMethod,
        [FromQuery] int pageNumber = 1,
        [FromQuery] int pageSize = 10)
    {
        var result = await _mediator.Send(new GetPaymentsWithPaginatedListQuery
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
    public async Task<IActionResult> Create([FromBody] CreatePaymentCommand command)
    {
        var result = await _mediator.Send(command);

        return Ok(new
        {
            success = true,
            message = "Thanh toán thành công.",
            data = result
        });
    }

    [HttpPut("{id:guid}")]
    public async Task<IActionResult> Update(
        Guid id,
        [FromBody] UpdatePaymentCommand command)
    {
        command.Id = id;

        var result = await _mediator.Send(command);

        return Ok(new
        {
            success = true,
            message = "Cập nhật thanh toán thành công.",
            data = result
        });
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id)
    {
        var result = await _mediator.Send(new DeletePaymentCommand
        {
            Id = id
        });

        return Ok(new
        {
            success = result,
            message = "Hủy thanh toán thành công."
        });
    }
}