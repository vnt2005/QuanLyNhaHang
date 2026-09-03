using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using QuanLyNhaHang.Application.Common.Constants;
using QuanLyNhaHang.Application.Features.Payments.Queries.GetById;
using QuanLyNhaHang.Application.Features.Payments.Queries.GetList;
using QuanLyNhaHang.Application.Features.Payments.Queries.GetWithPaginatedList;

namespace QuanLyNhaHang.Api.Controllers;

[ApiController]
[Route("api/payments")]
[Authorize]
public class PaymentsController : ControllerBase
{
    private readonly IMediator _mediator;

    public PaymentsController(IMediator mediator)
    {
        _mediator = mediator;
    }

    [HttpGet]
    [HasPermission(PermissionCodes.PaymentsView)]
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
    [HasPermission(PermissionCodes.PaymentsView)]
    public async Task<IActionResult> GetById(Guid id)
    {
        var result = await _mediator.Send(new GetPaymentByIdQuery
        {
            Id = id
        });

        if (result == null)
        {
            return NotFound(new
            {
                message = "Không tìm thấy giao dịch SePay đã xác minh."
            });
        }

        return Ok(result);
    }

    [HttpGet("paginated")]
    [HasPermission(PermissionCodes.PaymentsView)]
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
}
