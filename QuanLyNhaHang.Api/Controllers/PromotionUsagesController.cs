using MediatR;
using Microsoft.AspNetCore.Mvc;
using QuanLyNhaHang.Application.Features.PromotionUsages.Commands.Delete;
using QuanLyNhaHang.Application.Features.PromotionUsages.Commands.Update;
using QuanLyNhaHang.Application.Features.PromotionUsages.Queries.GetById;
using QuanLyNhaHang.Application.Features.PromotionUsages.Queries.GetList;
using QuanLyNhaHang.Application.Features.PromotionUsages.Queries.GetWithPaginatedList;

namespace QuanLyNhaHang.Api.Controllers;

[ApiController]
[Route("api/promotion-usages")]
public class PromotionUsagesController : ControllerBase
{
    private readonly IMediator _mediator;

    public PromotionUsagesController(IMediator mediator)
    {
        _mediator = mediator;
    }

    [HttpGet]
    public async Task<IActionResult> GetList(
        [FromQuery] Guid? promotionId,
        [FromQuery] Guid? orderId,
        [FromQuery] Guid? paymentId,
        [FromQuery] string? promotionCode,
        [FromQuery] string? status,
        [FromQuery] DateTime? fromDate,
        [FromQuery] DateTime? toDate)
    {
        var result = await _mediator.Send(new GetPromotionUsagesQuery
        {
            PromotionId = promotionId,
            OrderId = orderId,
            PaymentId = paymentId,
            PromotionCode = promotionCode,
            Status = status,
            FromDate = fromDate,
            ToDate = toDate
        });

        return Ok(result);
    }

    [HttpGet("paginated")]
    public async Task<IActionResult> GetWithPaginatedList(
        [FromQuery] string? keyword,
        [FromQuery] Guid? promotionId,
        [FromQuery] Guid? orderId,
        [FromQuery] Guid? paymentId,
        [FromQuery] string? status,
        [FromQuery] DateTime? fromDate,
        [FromQuery] DateTime? toDate,
        [FromQuery] int pageNumber = 1,
        [FromQuery] int pageSize = 10)
    {
        var result = await _mediator.Send(new GetPromotionUsagesWithPaginatedListQuery
        {
            Keyword = keyword,
            PromotionId = promotionId,
            OrderId = orderId,
            PaymentId = paymentId,
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
        var result = await _mediator.Send(new GetPromotionUsageByIdQuery
        {
            Id = id
        });

        if (result == null)
            return NotFound(new
            {
                message = "Không tìm thấy lịch sử sử dụng khuyến mãi."
            });

        return Ok(result);
    }

    [HttpPatch("{id:guid}/payment")]
    public async Task<IActionResult> UpdatePayment(
        Guid id,
        [FromBody] UpdatePromotionUsagePaymentCommand command)
    {
        command.Id = id;

        var result = await _mediator.Send(command);

        return Ok(new
        {
            success = true,
            message = "Cập nhật thanh toán cho lịch sử khuyến mãi thành công.",
            data = result
        });
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Cancel(Guid id)
    {
        var result = await _mediator.Send(new CancelPromotionUsageCommand
        {
            Id = id
        });

        return Ok(new
        {
            success = result,
            message = "Hủy lượt sử dụng khuyến mãi thành công."
        });
    }
}