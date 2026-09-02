using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using QuanLyNhaHang.Application.Common.Constants;
using QuanLyNhaHang.Application.Common.Interfaces;
using QuanLyNhaHang.Application.Features.AiAssistant.DTOs;

namespace QuanLyNhaHang.Api.Controllers;

[ApiController]
[Route("api/ai-assistant")]
public sealed class AiAssistantController : ControllerBase
{
    private readonly IAiAssistantService _assistantService;
    private readonly ILogger<AiAssistantController> _logger;

    public AiAssistantController(
        IAiAssistantService assistantService,
        ILogger<AiAssistantController> logger)
    {
        _assistantService = assistantService;
        _logger = logger;
    }

    [AllowAnonymous]
    [EnableRateLimiting("QrBrowse")]
    [HttpGet("public-config")]
    public async Task<IActionResult> GetPublicConfig(
        CancellationToken cancellationToken)
    {
        var result = await _assistantService.GetPublicConfigAsync(cancellationToken);
        return Ok(result);
    }

    [AllowAnonymous]
    [EnableRateLimiting("OrderCreate")]
    [HttpPost("chat")]
    public async Task<IActionResult> Chat(
        [FromBody] AiAssistantChatRequestDto request,
        CancellationToken cancellationToken)
    {
        try
        {
            var result = await _assistantService.ChatAsync(
                request,
                ResolveCallerContext(),
                cancellationToken);

            return Ok(result);
        }
        catch (ArgumentException exception)
        {
            return BadRequest(new { message = exception.Message });
        }
        catch (InvalidOperationException exception)
        {
            return MapProviderFailure(exception);
        }
        catch (Exception exception)
            when (!cancellationToken.IsCancellationRequested)
        {
            return HandleUnexpectedAiFailure(exception, "customer");
        }
    }

    [Authorize(Roles = SystemRoles.Admin)]
    [EnableRateLimiting("OrderCreate")]
    [HttpPost("admin-chat")]
    public async Task<IActionResult> AdminChat(
        [FromBody] AiAssistantChatRequestDto request,
        CancellationToken cancellationToken)
    {
        try
        {
            var userId = ResolveUserId()
                ?? throw new InvalidOperationException(
                    "Không xác định được tài khoản Admin đang đăng nhập.");

            var result = await _assistantService.AdminChatAsync(
                request,
                userId,
                cancellationToken);

            return Ok(result);
        }
        catch (ArgumentException exception)
        {
            return BadRequest(new { message = exception.Message });
        }
        catch (InvalidOperationException exception)
        {
            return MapProviderFailure(exception);
        }
        catch (Exception exception)
            when (!cancellationToken.IsCancellationRequested)
        {
            return HandleUnexpectedAiFailure(exception, "admin");
        }
    }

    [Authorize]
    [HasPermission(PermissionCodes.RestaurantSettingsView)]
    [HttpGet("admin-config")]
    public async Task<IActionResult> GetAdminConfig(
        CancellationToken cancellationToken)
    {
        try
        {
            var result = await _assistantService.GetAdminConfigAsync(
                cancellationToken);
            return Ok(result);
        }
        catch (InvalidOperationException exception)
        {
            return Conflict(new { message = exception.Message });
        }
    }

    [Authorize]
    [HasPermission(PermissionCodes.RestaurantSettingsManage)]
    [HttpPut("admin-config")]
    public async Task<IActionResult> UpdateAdminConfig(
        [FromBody] UpdateAiAssistantConfigDto input,
        CancellationToken cancellationToken)
    {
        try
        {
            var result = await _assistantService.UpdateConfigAsync(
                input,
                cancellationToken);

            return Ok(new
            {
                success = true,
                message = "Cập nhật cấu hình trợ lý AI thành công.",
                data = result
            });
        }
        catch (ArgumentException exception)
        {
            return BadRequest(new { message = exception.Message });
        }
        catch (InvalidOperationException exception)
        {
            return Conflict(new { message = exception.Message });
        }
    }

    private IActionResult MapProviderFailure(InvalidOperationException exception)
    {
        var isQuotaFailure = exception.Message.Contains(
            "hạn mức",
            StringComparison.OrdinalIgnoreCase)
            || exception.Message.Contains(
                "quota",
                StringComparison.OrdinalIgnoreCase);

        return StatusCode(
            isQuotaFailure
                ? StatusCodes.Status429TooManyRequests
                : StatusCodes.Status503ServiceUnavailable,
            new
            {
                message = exception.Message,
                traceId = HttpContext.TraceIdentifier
            });
    }

    private IActionResult HandleUnexpectedAiFailure(
        Exception exception,
        string audience)
    {
        _logger.LogError(
            exception,
            "Unhandled {Audience} AI request failure. TraceId={TraceId}",
            audience,
            HttpContext.TraceIdentifier);

        return StatusCode(
            StatusCodes.Status503ServiceUnavailable,
            new
            {
                message = "Trợ lý AI tạm thời không khả dụng. Vui lòng thử lại sau.",
                traceId = HttpContext.TraceIdentifier
            });
    }

    private AiAssistantCallerContext ResolveCallerContext()
    {
        return new AiAssistantCallerContext
        {
            UserId = ResolveUserId(),
            Role = User.FindFirstValue(ClaimTypes.Role)
                ?? User.FindFirstValue("role"),
            ClientId = ResolveClientId()
        };
    }

    private Guid? ResolveUserId()
    {
        var rawUserId = User.FindFirstValue(ClaimTypes.NameIdentifier)
            ?? User.FindFirstValue("sub");
        return Guid.TryParse(rawUserId, out var userId) ? userId : null;
    }

    private string? ResolveClientId()
    {
        var clientId = Request.Headers["X-Client-Id"].ToString().Trim();
        if (clientId.Length is >= 8 and <= 128
            && clientId.All(character =>
                char.IsAsciiLetterOrDigit(character)
                || character is '-' or '_' or '.'))
        {
            return clientId;
        }

        return null;
    }
}
