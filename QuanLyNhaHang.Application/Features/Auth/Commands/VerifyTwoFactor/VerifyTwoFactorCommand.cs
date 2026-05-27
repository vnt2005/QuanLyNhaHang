using MediatR;
using QuanLyNhaHang.Application.Features.Auth.DTOs;

namespace QuanLyNhaHang.Application.Features.Auth.Commands.VerifyTwoFactor;

public class VerifyTwoFactorCommand : IRequest<AuthResponseDto>
{
    public string Email { get; set; } = string.Empty;

    public string Code { get; set; } = string.Empty;
}
