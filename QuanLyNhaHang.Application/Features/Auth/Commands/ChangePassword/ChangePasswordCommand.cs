using MediatR;

namespace QuanLyNhaHang.Application.Features.Auth.Commands.ChangePassword;

public sealed class ChangePasswordCommand : IRequest<string>
{
    public string CurrentPassword { get; set; } = string.Empty;

    public string NewPassword { get; set; } = string.Empty;

    public string ConfirmNewPassword { get; set; } = string.Empty;
}
