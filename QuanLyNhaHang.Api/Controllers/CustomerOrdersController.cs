using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using QuanLyNhaHang.Application.Common.Constants;
using QuanLyNhaHang.Application.Common.Interfaces;
using QuanLyNhaHang.Application.Features.CustomerOrders.Commands.Claim;
using QuanLyNhaHang.Application.Features.CustomerOrders.Commands.Create;
using QuanLyNhaHang.Application.Features.CustomerOrders.Queries.GetHistory;
using QuanLyNhaHang.Application.Features.QrOrders.Commands.Create;

namespace QuanLyNhaHang.Api.Controllers;

[ApiController]
[Route("api/customer/orders")]
[Authorize(Roles = SystemRoles.Customer)]
public class CustomerOrdersController : ControllerBase
{
    private readonly IMediator _mediator;
    private readonly ICurrentUserService _currentUserService;

    public CustomerOrdersController(
        IMediator mediator,
        ICurrentUserService currentUserService)
    {
        _mediator = mediator;
        _currentUserService = currentUserService;
    }

    [HttpGet]
    public async Task<IActionResult> GetHistory(
        [FromQuery] GetCustomerOrderHistoryQuery query)
    {
        return Ok(await _mediator.Send(query));
    }

    [EnableRateLimiting("QrCreate")]
    [HttpPost]
    public async Task<IActionResult> CreateOrder(
        [FromBody] CreateCustomerOrderRequest request)
    {
        var customerUserId = _currentUserService.UserId
            ?? throw new UnauthorizedAccessException(
                "Vui lòng đăng nhập tài khoản khách hàng.");

        var result = await _mediator.Send(new CreateQrOrderCommand
        {
            Token = request.Token,
            Note = request.Note,
            Items = request.Items,
            CustomerUserId = customerUserId
        });

        return Ok(new
        {
            success = true,
            message = "Gọi món thành công và đã lưu vào tài khoản.",
            data = result
        });
    }

    [HttpPost("{orderId:guid}/claim")]
    public async Task<IActionResult> ClaimOrder(
        Guid orderId,
        [FromBody] ClaimCustomerOrderRequest request)
    {
        await _mediator.Send(new ClaimCustomerOrderCommand
        {
            OrderId = orderId,
            Token = request.Token
        });

        return Ok(new
        {
            success = true,
            message = "Đã lưu đơn vào tài khoản khách hàng."
        });
    }
}

