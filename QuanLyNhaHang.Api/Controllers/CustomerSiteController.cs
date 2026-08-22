using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using QuanLyNhaHang.Application.Common.Interfaces;
using QuanLyNhaHang.Application.Features.CustomerOrders.Commands.CreateTakeaway;
using QuanLyNhaHang.Application.Features.CustomerSite.DTOs;
using QuanLyNhaHang.Application.Features.CustomerSite.Queries.GetBootstrap;
using QuanLyNhaHang.Application.Features.Reservations.Commands.Create;

namespace QuanLyNhaHang.Api.Controllers;

[ApiController]
[Route("api/customer-site")]
public sealed class CustomerSiteController : ControllerBase
{
    private readonly IMediator _mediator;
    private readonly ICurrentUserService _currentUserService;

    public CustomerSiteController(
        IMediator mediator,
        ICurrentUserService currentUserService)
    {
        _mediator = mediator;
        _currentUserService = currentUserService;
    }

    [AllowAnonymous]
    [EnableRateLimiting("QrBrowse")]
    [HttpGet("bootstrap")]
    public async Task<IActionResult> GetBootstrap(
        CancellationToken cancellationToken)
    {
        var result = await _mediator.Send(
            new GetCustomerSiteBootstrapQuery(),
            cancellationToken);

        return Ok(result);
    }

    [AllowAnonymous]
    [EnableRateLimiting("ReservationCreate")]
    [IdempotentRequest("customer-reservation-create")]
    [HttpPost("reservations")]
    public async Task<IActionResult> CreateReservation(
        [FromBody] CreateCustomerReservationRequest request,
        CancellationToken cancellationToken)
    {
        var result = await _mediator.Send(
            new CreateReservationCommand
            {
                RestaurantTableId = request.RestaurantTableId,
                CustomerName = request.CustomerName,
                PhoneNumber = request.PhoneNumber,
                Email = request.Email,
                NumberOfGuests = request.NumberOfGuests,
                ReservationTime = request.ReservationTime,
                DepositAmount = 0,
                Note = request.Note,
                IsCustomerRequest = true
            },
            cancellationToken);

        return Ok(new
        {
            success = true,
            message = "Yêu cầu đặt bàn đã được gửi thành công.",
            data = result
        });
    }

    [AllowAnonymous]
    [EnableRateLimiting("OrderCreate")]
    [IdempotentRequest("customer-takeaway-create")]
    [HttpPost("takeaway-orders")]
    public async Task<IActionResult> CreateTakeawayOrder(
        [FromBody] CreateTakeawayOrderCommand command,
        CancellationToken cancellationToken)
    {
        command.CustomerUserId = User.Identity?.IsAuthenticated == true
            ? _currentUserService.UserId
            : null;

        var result = await _mediator.Send(command, cancellationToken);

        return Ok(new
        {
            success = true,
            message = command.CustomerUserId.HasValue
                ? "Đặt món mang về thành công và đã lưu vào tài khoản."
                : "Đặt món mang về thành công.",
            data = result
        });
    }
}
