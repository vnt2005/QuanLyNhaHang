using MediatR;
using Microsoft.EntityFrameworkCore;
using QuanLyNhaHang.Application.Common.Constants;
using QuanLyNhaHang.Application.Common.Interfaces;
using QuanLyNhaHang.Application.Features.Permissions.DTOs;

namespace QuanLyNhaHang.Application.Features.Permissions.Commands.Update;

public class UpdatePermissionCommandHandler : IRequestHandler<UpdatePermissionCommand, PermissionDto>
{
    private readonly IApplicationDbContext _context;

    public UpdatePermissionCommandHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<PermissionDto> Handle(
        UpdatePermissionCommand request,
        CancellationToken cancellationToken)
    {
        var permission = await _context.Permissions
            .FirstOrDefaultAsync(x => x.Id == request.Id, cancellationToken);

        if (permission == null)
            throw new Exception("Không tìm thấy quyền.");

        if (PermissionCatalog.IsSystemPermission(permission.Code) && !request.IsActive)
        {
            throw new InvalidOperationException(
                "Không thể vô hiệu hóa quyền hệ thống.");
        }

        permission.UpdateInfo(
            request.Name,
            request.GroupName,
            request.Description);

        if (request.IsActive)
            permission.Activate();
        else
            permission.Deactivate();

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
