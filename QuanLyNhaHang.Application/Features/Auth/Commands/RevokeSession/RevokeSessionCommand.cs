using MediatR;

namespace QuanLyNhaHang.Application.Features.Auth.Commands.RevokeSession;

public sealed class RevokeSessionCommand : IRequest<bool>
{
    public Guid SessionId { get; set; }
}
