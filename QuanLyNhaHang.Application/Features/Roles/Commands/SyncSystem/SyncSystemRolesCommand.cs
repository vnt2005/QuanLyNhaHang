using MediatR;
using QuanLyNhaHang.Application.Features.Roles.DTOs;

namespace QuanLyNhaHang.Application.Features.Roles.Commands.SyncSystem;

public sealed class SyncSystemRolesCommand : IRequest<SystemRoleSyncResultDto>
{
}
