using MediatR;
using Microsoft.EntityFrameworkCore;
using QuanLyNhaHang.Application.Common.Constants;
using QuanLyNhaHang.Application.Common.Interfaces;

namespace QuanLyNhaHang.Application.Features.CustomerOrders.Commands.Claim;

public class ClaimCustomerOrderCommandHandler
    : IRequestHandler<ClaimCustomerOrderCommand, bool>
{
    private readonly IApplicationDbContext _context;
    private readonly ICurrentUserService _currentUserService;

    public ClaimCustomerOrderCommandHandler(
        IApplicationDbContext context,
        ICurrentUserService currentUserService)
    {
        _context = context;
        _currentUserService = currentUserService;
    }

    public async Task<bool> Handle(
        ClaimCustomerOrderCommand request,
        CancellationToken cancellationToken)
    {
        var customerUserId = _currentUserService.UserId
            ?? throw new UnauthorizedAccessException(
                "Vui lòng đăng nhập tài khoản khách hàng.");

        var isActiveCustomer = await _context.Users
            .AsNoTracking()
            .AnyAsync(
                x =>
                    x.Id == customerUserId &&
                    x.Role == SystemRoles.Customer &&
                    x.IsActive &&
                    x.IsEmailVerified,
                cancellationToken);

        if (!isActiveCustomer)
        {
            throw new UnauthorizedAccessException(
                "Tài khoản khách hàng không còn hợp lệ.");
        }

        if (string.IsNullOrWhiteSpace(request.Token))
            throw new ArgumentException("Mã QR không hợp lệ.");

        var tableId = await _context.TableQrCodes
            .AsNoTracking()
            .Where(x =>
                x.Token == request.Token.Trim() &&
                x.IsActive &&
                x.Status == "Active")
            .Select(x => (Guid?)x.RestaurantTableId)
            .FirstOrDefaultAsync(cancellationToken);

        if (!tableId.HasValue)
            throw new KeyNotFoundException("Mã QR không hợp lệ.");

        var order = await _context.Orders
            .FirstOrDefaultAsync(
                x =>
                    x.Id == request.OrderId &&
                    x.RestaurantTableId == tableId.Value &&
                    x.IsActive,
                cancellationToken);

        if (order == null)
            throw new KeyNotFoundException("Không tìm thấy đơn của bàn này.");

        order.AssignCustomer(customerUserId);
        await _context.SaveChangesAsync(cancellationToken);
        return true;
    }
}
