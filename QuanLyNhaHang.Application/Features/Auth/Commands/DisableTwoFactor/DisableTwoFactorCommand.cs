using MediatR;

namespace QuanLyNhaHang.Application.Features.Auth.Commands.DisableTwoFactor;

public class DisableTwoFactorCommand : IRequest<string>
{
    public string Password { get; set; } = string.Empty;
}