using MediatR;
using Microsoft.EntityFrameworkCore;
using QuanLyNhaHang.Application.Common.Interfaces;
using QuanLyNhaHang.Application.Features.Permissions.DTOs;
using QuanLyNhaHang.Domain.Entities;

namespace QuanLyNhaHang.Application.Features.Permissions.Commands.Create;

public class CreatePermissionCommandHandler : IRequestHandler<CreatePermissionCommand, PermissionDto>
{
    private readonly IApplicationDbContext _context;

    public CreatePermissionCommandHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<PermissionDto> Handle(
        CreatePermissionCommand request,
        CancellationToken cancellationToken)
    {
        var permissionCode = request.Code.Trim();

        var existedPermission = await _context.Permissions
            .AnyAsync(x => x.Code == permissionCode, cancellationToken);

        if (existedPermission)
            throw new Exception("Mã quyền đã tồn tại.");

        var permission = new Permission(
            permissionCode,
            request.Name,
            request.GroupName,
            request.Description);

        await _context.Permissions.AddAsync(permission, cancellationToken);

        await _context.SaveChangesAsync(cancellationToken);

        return new PermissionDto
        {
            Id = permission.Id,
            Code = permission.Code,
            Name = permission.Name,
            GroupName = permission.GroupName,
            Description = permission.Description,
            IsActive = permission.IsActive,
            CreatedAt = permission.CreatedAt,
            UpdatedAt = permission.UpdatedAt
        };
    }
}