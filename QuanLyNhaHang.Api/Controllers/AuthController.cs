using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using QuanLyNhaHang.Application.Features.Auth.Commands.DisableTwoFactor;
using QuanLyNhaHang.Application.Features.Auth.Commands.EnableTwoFactor;
using QuanLyNhaHang.Application.Features.Auth.Commands.ForgotPassword;
using QuanLyNhaHang.Application.Features.Auth.Commands.Login;
using QuanLyNhaHang.Application.Features.Auth.Commands.Logout;
using QuanLyNhaHang.Application.Features.Auth.Commands.LogoutAll;
using QuanLyNhaHang.Application.Features.Auth.Commands.RefreshToken;
using QuanLyNhaHang.Application.Features.Auth.Commands.Register;
using QuanLyNhaHang.Application.Features.Auth.Commands.ResetPassword;
using QuanLyNhaHang.Application.Features.Auth.Commands.RevokeSession;
using QuanLyNhaHang.Application.Features.Auth.Commands.VerifyTwoFactor;
using QuanLyNhaHang.Application.Features.Auth.Queries.GetAuthSessions;
using QuanLyNhaHang.Application.Features.Auth.Queries.GetCurrentSession;

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
    [AllowAnonymous]
    [EnableRateLimiting("AuthSensitive")]
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
    [AllowAnonymous]
    [EnableRateLimiting("AuthLogin")]
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

    // POST: api/auth/refresh
    [AllowAnonymous]
    [EnableRateLimiting("AuthSensitive")]
    [HttpPost("refresh")]
    public async Task<IActionResult> RefreshToken(
        [FromBody] RefreshTokenCommand command,
        CancellationToken cancellationToken)
    {
        var result = await _mediator.Send(command, cancellationToken);

        return Ok(new
        {
            Message = result.Message,
            Data = result
        });
    }

    // POST: api/auth/logout
    [AllowAnonymous]
    [EnableRateLimiting("AuthSensitive")]
    [HttpPost("logout")]
    public async Task<IActionResult> Logout(
        [FromBody] LogoutCommand command,
        CancellationToken cancellationToken)
    {
        await _mediator.Send(command, cancellationToken);

        return Ok(new
        {
            Message = "Đăng xuất thành công."
        });
    }

    // POST: api/auth/logout-all
    [Authorize]
    [EnableRateLimiting("AuthSensitive")]
    [HttpPost("logout-all")]
    public async Task<IActionResult> LogoutAll(
        CancellationToken cancellationToken)
    {
        var revokedCount = await _mediator.Send(
            new LogoutAllCommand(),
            cancellationToken);

        return Ok(new
        {
            Message = "Đã đăng xuất khỏi tất cả thiết bị.",
            Data = new { RevokedCount = revokedCount }
        });
    }

    // GET: api/auth/me
    [Authorize]
    [HttpGet("me")]
    public async Task<IActionResult> GetCurrentSession(
        CancellationToken cancellationToken)
    {
        var result = await _mediator.Send(
            new GetCurrentSessionQuery(),
            cancellationToken);

        return Ok(new
        {
            Message = "Lấy thông tin phiên đăng nhập hiện tại thành công.",
            Data = result
        });
    }

    // GET: api/auth/sessions
    [Authorize]
    [HttpGet("sessions")]
    public async Task<IActionResult> GetSessions(
        CancellationToken cancellationToken)
    {
        var result = await _mediator.Send(
            new GetAuthSessionsQuery(),
            cancellationToken);

        return Ok(new
        {
            Message = "Lấy danh sách phiên đăng nhập thành công.",
            Data = result
        });
    }

    // DELETE: api/auth/sessions/{sessionId}
    [Authorize]
    [EnableRateLimiting("AuthSensitive")]
    [HttpDelete("sessions/{sessionId:guid}")]
    public async Task<IActionResult> RevokeSession(
        Guid sessionId,
        CancellationToken cancellationToken)
    {
        await _mediator.Send(
            new RevokeSessionCommand { SessionId = sessionId },
            cancellationToken);

        return Ok(new
        {
            Message = "Thu hồi phiên đăng nhập thành công."
        });
    }

    // POST: api/auth/verify-2fa
    [AllowAnonymous]
    [EnableRateLimiting("AuthSensitive")]
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
    [AllowAnonymous]
    [EnableRateLimiting("AuthSensitive")]
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
    [AllowAnonymous]
    [EnableRateLimiting("AuthSensitive")]
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
    [Authorize]
    [EnableRateLimiting("AuthSensitive")]
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
    [Authorize]
    [EnableRateLimiting("AuthSensitive")]
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
