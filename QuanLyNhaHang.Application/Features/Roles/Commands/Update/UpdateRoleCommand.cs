using MediatR;
using QuanLyNhaHang.Application.Features.Roles.DTOs;

namespace QuanLyNhaHang.Application.Features.Roles.Commands.Update;

public class UpdateRoleCommand : IRequest<RoleDto>
{
    public Guid Id { get; set; }

    public string DisplayName { get; set; } = string.Empty;

    public string? Description { get; set; }

    public bool IsActive { get; set; } = true;
}