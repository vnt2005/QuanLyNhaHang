using MediatR;
using QuanLyNhaHang.Application.Features.Permissions.DTOs;

namespace QuanLyNhaHang.Application.Features.Permissions.Commands.Create;

public class CreatePermissionCommand : IRequest<PermissionDto>
{
    public string Code { get; set; } = string.Empty;

    public string Name { get; set; } = string.Empty;

    public string GroupName { get; set; } = string.Empty;

    public string? Description { get; set; }
}