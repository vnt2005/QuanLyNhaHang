using MediatR;

namespace QuanLyNhaHang.Application.Features.Auth.Commands.EnableTwoFactor;

public class EnableTwoFactorCommand : IRequest<string>
{
    public string Password { get; set; } = string.Empty;
}