using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using QuanLyNhaHang.Application.Features.Promotions.Commands.Create;
using QuanLyNhaHang.Application.Features.Promotions.Commands.Delete;
using QuanLyNhaHang.Application.Features.Promotions.Commands.Update;
using QuanLyNhaHang.Application.Features.Promotions.Queries.GetById;
using QuanLyNhaHang.Application.Features.Promotions.Queries.GetList;
using QuanLyNhaHang.Application.Features.Promotions.Queries.GetWithPaginatedList;

namespace QuanLyNhaHang.Api.Controllers;

[ApiController]
[Route("api/promotions")]
[Authorize(Roles = "Admin")]
public class PromotionsController : ControllerBase
{
    private readonly IMediator _mediator;

    public PromotionsController(IMediator mediator)
    {
        _mediator = mediator;
    }

    [HttpGet]
    public async Task<IActionResult> GetList(
        [FromQuery] string? discountType,
        [FromQuery] bool? isActive,
        [FromQuery] bool? isValidNow)
    {
        var result = await _mediator.Send(new GetPromotionsQuery
        {
            DiscountType = discountType,
            IsActive = isActive,
            IsValidNow = isValidNow
        });

        return Ok(result);
    }

    [HttpGet("paginated")]
    public async Task<IActionResult> GetWithPaginatedList(
        [FromQuery] string? keyword,
        [FromQuery] string? discountType,
        [FromQuery] bool? isActive,
        [FromQuery] bool? isValidNow,
        [FromQuery] int pageNumber = 1,
        [FromQuery] int pageSize = 10)
    {
        var result = await _mediator.Send(new GetPromotionsWithPaginatedListQuery
        {
            Keyword = keyword,
            DiscountType = discountType,
            IsActive = isActive,
            IsValidNow = isValidNow,
            PageNumber = pageNumber,
            PageSize = pageSize
        });

        return Ok(result);
    }

    [HttpGet("{id:guid}")]
    public async Task<IActionResult> GetById(Guid id)
    {
        var result = await _mediator.Send(new GetPromotionByIdQuery
        {
            Id = id
        });

        if (result == null)
            return NotFound(new
            {
                message = "Không tìm thấy khuyến mãi."
            });

        return Ok(result);
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreatePromotionCommand command)
    {
        var result = await _mediator.Send(command);

        return Ok(new
        {
            success = true,
            message = "Tạo khuyến mãi thành công.",
            data = result
        });
    }

    [HttpPost("apply")]
    public async Task<IActionResult> ApplyPromotion([FromBody] ApplyPromotionCommand command)
    {
        var result = await _mediator.Send(command);

        return Ok(new
        {
            success = true,
            message = "Áp dụng mã khuyến mãi thành công.",
            data = result
        });
    }

    [HttpPut("{id:guid}")]
    public async Task<IActionResult> Update(
        Guid id,
        [FromBody] UpdatePromotionCommand command)
    {
        command.Id = id;

        var result = await _mediator.Send(command);

        return Ok(new
        {
            success = true,
            message = "Cập nhật khuyến mãi thành công.",
            data = result
        });
    }

    [HttpDelete("{id:guid}")]
    public async Task<IActionResult> Delete(Guid id)
    {
        var result = await _mediator.Send(new DeletePromotionCommand
        {
            Id = id
        });

        return Ok(new
        {
            success = result,
            message = "Vô hiệu hóa khuyến mãi thành công."
        });
    }
}