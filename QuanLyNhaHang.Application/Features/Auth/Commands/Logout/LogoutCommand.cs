using MediatR;

namespace QuanLyNhaHang.Application.Features.Auth.Commands.Logout;

public sealed class LogoutCommand : IRequest<bool>
{
    public string RefreshToken { get; set; } = string.Empty;
}
