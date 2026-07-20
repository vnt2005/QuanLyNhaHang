using MediatR;
using Microsoft.EntityFrameworkCore;
using QuanLyNhaHang.Application.Common.Constants;
using QuanLyNhaHang.Application.Common.Interfaces;
using QuanLyNhaHang.Application.Features.Roles.DTOs;
using QuanLyNhaHang.Domain.Entities;

namespace QuanLyNhaHang.Application.Features.Roles.Commands.Create;

public class CreateRoleCommandHandler : IRequestHandler<CreateRoleCommand, RoleDto>
{
    private readonly IApplicationDbContext _context;

    public CreateRoleCommandHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<RoleDto> Handle(
        CreateRoleCommand request,
        CancellationToken cancellationToken)
    {
        var roleName = request.Name.Trim();

        if (SystemRoleCatalog.IsSystemRole(roleName))
        {
            throw new InvalidOperationException(
                $"Tên vai trò '{roleName}' là tên hệ thống dành riêng. Hãy sử dụng chức năng đồng bộ vai trò hệ thống.");
        }

        var existedRole = await _context.Roles
            .AnyAsync(x => x.Name == roleName, cancellationToken);

        if (existedRole)
            throw new Exception("Tên vai trò đã tồn tại.");

        var role = new Role(
            roleName,
            request.DisplayName,
            request.Description);

        await _context.Roles.AddAsync(role, cancellationToken);

        await _context.SaveChangesAsync(cancellationToken);

        return new RoleDto
        {
            Id = role.Id,
            Name = role.Name,
            DisplayName = role.DisplayName,
            Description = role.Description,
            IsActive = role.IsActive,
            CreatedAt = role.CreatedAt,
            UpdatedAt = role.UpdatedAt
        };
    }
}
