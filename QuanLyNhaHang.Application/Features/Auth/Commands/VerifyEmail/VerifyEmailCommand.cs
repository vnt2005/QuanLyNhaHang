using MediatR;

namespace QuanLyNhaHang.Application.Features.Auth.Commands.VerifyEmail;

public sealed class VerifyEmailCommand : IRequest<string>
{
    public string Email { get; set; } = string.Empty;

    public string Code { get; set; } = string.Empty;
}
