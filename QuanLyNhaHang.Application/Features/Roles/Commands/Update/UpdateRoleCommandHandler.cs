using MediatR;
using Microsoft.EntityFrameworkCore;
using QuanLyNhaHang.Application.Common.Constants;
using QuanLyNhaHang.Application.Common.Interfaces;
using QuanLyNhaHang.Application.Features.Roles.DTOs;

namespace QuanLyNhaHang.Application.Features.Roles.Commands.Update;

public class UpdateRoleCommandHandler : IRequestHandler<UpdateRoleCommand, RoleDto>
{
    private readonly IApplicationDbContext _context;

    public UpdateRoleCommandHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<RoleDto> Handle(
        UpdateRoleCommand request,
        CancellationToken cancellationToken)
    {
        var role = await _context.Roles
            .FirstOrDefaultAsync(x => x.Id == request.Id, cancellationToken);

        if (role == null)
            throw new Exception("Không tìm thấy vai trò.");

        if (SystemRoleCatalog.IsSystemRole(role.Name) && !request.IsActive)
        {
            throw new InvalidOperationException(
                $"Vai trò hệ thống '{role.Name}' không thể bị vô hiệu hóa.");
        }

        role.UpdateInfo(
            request.DisplayName,
            request.Description);

        if (request.IsActive)
            role.Activate();
        else
            role.Deactivate();

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
