using MediatR;

namespace QuanLyNhaHang.Application.Features.Auth.Commands.ResendVerificationEmail;

public sealed class ResendVerificationEmailCommand : IRequest<string>
{
    public string Email { get; set; } = string.Empty;
}
