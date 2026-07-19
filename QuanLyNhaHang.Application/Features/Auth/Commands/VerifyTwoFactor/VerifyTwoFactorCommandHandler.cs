using MediatR;
using Microsoft.EntityFrameworkCore;
using QuanLyNhaHang.Application.Common.Interfaces;
using QuanLyNhaHang.Application.Features.Auth.DTOs;

namespace QuanLyNhaHang.Application.Features.Auth.Commands.VerifyTwoFactor;

public class VerifyTwoFactorCommandHandler : IRequestHandler<VerifyTwoFactorCommand, AuthResponseDto>
{
    private readonly IApplicationDbContext _context;
    private readonly IJwtTokenService _jwtTokenService;
    private readonly IUserPermissionService _userPermissionService;

    public VerifyTwoFactorCommandHandler(
        IApplicationDbContext context,
        IJwtTokenService jwtTokenService,
        IUserPermissionService userPermissionService)
    {
        _context = context;
        _jwtTokenService = jwtTokenService;
        _userPermissionService = userPermissionService;
    }

    public async Task<AuthResponseDto> Handle(
        VerifyTwoFactorCommand request,
        CancellationToken cancellationToken)
    {
        var email = request.Email.Trim().ToLower();

        var user = await _context.Users
            .FirstOrDefaultAsync(x => x.Email == email, cancellationToken);

        if (user == null)
        {
            throw new Exception("Tài khoản không tồn tại.");
        }

        if (!user.IsActive)
        {
            throw new Exception("Tài khoản đã bị khóa.");
        }

        if (!user.TwoFactorEnabled)
        {
            throw new Exception("Tài khoản chưa bật xác thực 2 yếu tố.");
        }

        if (!user.IsTwoFactorCodeValid(request.Code))
        {
            throw new Exception("Mã xác thực không đúng hoặc đã hết hạn.");
        }

        user.ClearTwoFactorCode();

        await _context.SaveChangesAsync(cancellationToken);

        var permissions = await _userPermissionService.GetPermissionsAsync(
            user.Role,
            cancellationToken);

        var token = _jwtTokenService.GenerateToken(user, permissions);

        return new AuthResponseDto
        {
            UserId = user.Id,
            Ho = user.Ho,
            Ten = user.Ten,
            Email = user.Email,
            PhoneNumber = user.PhoneNumber,
            Role = user.Role,
            IsActive = user.IsActive,
            TwoFactorEnabled = user.TwoFactorEnabled,
            RequiresTwoFactor = false,
            Token = token,
            Permissions = permissions.ToList(),
            Message = "Xác thực 2 yếu tố thành công."
        };
    }
}