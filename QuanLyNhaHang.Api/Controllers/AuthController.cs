using MediatR;
using Microsoft.AspNetCore.Mvc;
using QuanLyNhaHang.Application.Features.Auth.Commands.DisableTwoFactor;
using QuanLyNhaHang.Application.Features.Auth.Commands.EnableTwoFactor;
using QuanLyNhaHang.Application.Features.Auth.Commands.ForgotPassword;
using QuanLyNhaHang.Application.Features.Auth.Commands.Login;
using QuanLyNhaHang.Application.Features.Auth.Commands.Register;
using QuanLyNhaHang.Application.Features.Auth.Commands.ResetPassword;
using QuanLyNhaHang.Application.Features.Auth.Commands.VerifyTwoFactor;

namespace QuanLyNhaHang.Api.Controllers;

[Route("api/[controller]")]
[ApiController]
public class AuthController : ControllerBase
{
    private readonly IMediator _mediator;

    public AuthController(IMediator mediator)
    {
        _mediator = mediator;
    }

    // POST: api/auth/register
    [HttpPost("register")]
    public async Task<IActionResult> Register(
        [FromBody] RegisterCommand command,
        CancellationToken cancellationToken)
    {
        var result = await _mediator.Send(command, cancellationToken);

        return Ok(new
        {
            Message = string.IsNullOrWhiteSpace(result.Message)
                ? "Đăng ký thành công."
                : result.Message,
            Data = result
        });
    }

    // POST: api/auth/login
    [HttpPost("login")]
    public async Task<IActionResult> Login(
        [FromBody] LoginCommand command,
        CancellationToken cancellationToken)
    {
        var result = await _mediator.Send(command, cancellationToken);

        return Ok(new
        {
            Message = string.IsNullOrWhiteSpace(result.Message)
                ? "Đăng nhập thành công."
                : result.Message,
            Data = result
        });
    }

    // POST: api/auth/verify-2fa
    [HttpPost("verify-2fa")]
    public async Task<IActionResult> VerifyTwoFactor(
        [FromBody] VerifyTwoFactorCommand command,
        CancellationToken cancellationToken)
    {
        var result = await _mediator.Send(command, cancellationToken);

        return Ok(new
        {
            Message = string.IsNullOrWhiteSpace(result.Message)
                ? "Xác thực 2 yếu tố thành công."
                : result.Message,
            Data = result
        });
    }

    // POST: api/auth/forgot-password
    [HttpPost("forgot-password")]
    public async Task<IActionResult> ForgotPassword(
        [FromBody] ForgotPasswordCommand command,
        CancellationToken cancellationToken)
    {
        var result = await _mediator.Send(command, cancellationToken);

        return Ok(new
        {
            Message = result
        });
    }

    // POST: api/auth/reset-password
    [HttpPost("reset-password")]
    public async Task<IActionResult> ResetPassword(
        [FromBody] ResetPasswordCommand command,
        CancellationToken cancellationToken)
    {
        var result = await _mediator.Send(command, cancellationToken);

        return Ok(new
        {
            Message = result
        });
    }

    // POST: api/auth/enable-2fa
    [HttpPost("enable-2fa")]
    public async Task<IActionResult> EnableTwoFactor(
        [FromBody] EnableTwoFactorCommand command,
        CancellationToken cancellationToken)
    {
        var result = await _mediator.Send(command, cancellationToken);

        return Ok(new
        {
            Message = result
        });
    }

    // POST: api/auth/disable-2fa
    [HttpPost("disable-2fa")]
    public async Task<IActionResult> DisableTwoFactor(
        [FromBody] DisableTwoFactorCommand command,
        CancellationToken cancellationToken)
    {
        var result = await _mediator.Send(command, cancellationToken);

        return Ok(new
        {
            Message = result
        });
    }
}