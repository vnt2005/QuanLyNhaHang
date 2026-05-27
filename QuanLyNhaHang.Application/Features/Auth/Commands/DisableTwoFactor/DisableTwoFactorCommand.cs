using MediatR;

namespace QuanLyNhaHang.Application.Features.Auth.Commands.DisableTwoFactor;

public class DisableTwoFactorCommand : IRequest<string>
{
    public Guid UserId { get; set; }
}