using MediatR;
using QuanLyNhaHang.Application.Features.Permissions.DTOs;

namespace QuanLyNhaHang.Application.Features.Permissions.Commands.Update;

public class UpdatePermissionCommand : IRequest<PermissionDto>
{
    public Guid Id { get; set; }

    public string Name { get; set; } = string.Empty;

    public string GroupName { get; set; } = string.Empty;

    public string? Description { get; set; }

    public bool IsActive { get; set; } = true;
}