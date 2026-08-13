using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using QuanLyNhaHang.Application.Features.CustomerSite.DTOs;
using QuanLyNhaHang.Application.Features.CustomerSite.Queries.GetBootstrap;
using QuanLyNhaHang.Application.Features.Reservations.Commands.Create;

namespace QuanLyNhaHang.Api.Controllers;

[ApiController]
[Route("api/customer-site")]
public sealed class CustomerSiteController : ControllerBase
{
    private readonly IMediator _mediator;

    public CustomerSiteController(IMediator mediator)
    {
        _mediator = mediator;
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
    [EnableRateLimiting("CustomerReservation")]
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
}
