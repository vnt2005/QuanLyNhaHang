using MediatR;

namespace QuanLyNhaHang.Application.Features.Auth.Commands.ForgotPassword;

public class ForgotPasswordCommand : IRequest<string>
{
    public string Email { get; set; } = string.Empty;
}