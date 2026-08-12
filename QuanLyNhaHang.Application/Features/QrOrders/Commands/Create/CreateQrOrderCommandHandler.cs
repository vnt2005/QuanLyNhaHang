using MediatR;
using Microsoft.EntityFrameworkCore;
using QuanLyNhaHang.Application.Common.Constants;
using QuanLyNhaHang.Application.Common.Extensions;
using QuanLyNhaHang.Application.Common.Interfaces;
using QuanLyNhaHang.Application.Features.QrOrders.DTOs;
using QuanLyNhaHang.Domain.Entities;

namespace QuanLyNhaHang.Application.Features.QrOrders.Commands.Create;

public class CreateQrOrderCommandHandler
    : IRequestHandler<CreateQrOrderCommand, QrOrderDto>
{
    private readonly IApplicationDbContext _context;

    public CreateQrOrderCommandHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<QrOrderDto> Handle(
        CreateQrOrderCommand request,
        CancellationToken cancellationToken)
    {
        var token = request.Token.Trim();

        var qrCode = await _context.TableQrCodes
            .FirstOrDefaultAsync(x => x.Token == token, cancellationToken);

        if (qrCode == null)
            throw new KeyNotFoundException("Mã QR không hợp lệ.");

        if (!qrCode.IsActive || qrCode.Status != "Active")
            throw new InvalidOperationException("Mã QR đã bị vô hiệu hóa.");

        var table = await _context.RestaurantTables
            .WhereOperational(_context)
            .FirstOrDefaultAsync(
                x => x.Id == qrCode.RestaurantTableId,
                cancellationToken);

        if (table == null)
        {
            throw new InvalidOperationException(
                "Bàn không tồn tại hoặc đã ngừng hoạt động.");
        }

        if (request.Items is null || request.Items.Count == 0)
        {
            throw new ArgumentException(
                "Order phải có ít nhất một món.");
        }

        if (request.Items.Count > 50)
            throw new ArgumentException("Một order không được vượt quá 50 dòng món.");

        foreach (var item in request.Items)
        {
            if (item.MenuItemId == Guid.Empty)
                throw new ArgumentException("Món ăn không hợp lệ.");

            if (item.Quantity <= 0 || item.Quantity > 99)
            {
                throw new ArgumentException(
                    "Số lượng mỗi món phải từ 1 đến 99.");
            }
        }

        var menuItemIds = request.Items
            .Select(x => x.MenuItemId)
            .Distinct()
            .ToList();

        var menuItems = await _context.MenuItems
            .Where(x =>
                menuItemIds.Contains(x.Id) &&
                x.IsActive &&
                x.IsAvailable)
            .ToListAsync(cancellationToken);

        if (menuItems.Count != menuItemIds.Count)
        {
            throw new InvalidOperationException(
                "Có món không tồn tại hoặc hiện không phục vụ.");
        }

        var orderCode = GenerateOrderCode();

        if (request.CustomerUserId.HasValue)
        {
            var isActiveCustomer = await _context.Users
                .AsNoTracking()
                .AnyAsync(
                    x =>
                        x.Id == request.CustomerUserId.Value &&
                        x.Role == SystemRoles.Customer &&
                        x.IsActive &&
                        x.IsEmailVerified,
                    cancellationToken);

            if (!isActiveCustomer)
            {
                throw new UnauthorizedAccessException(
                    "Tài khoản khách hàng không còn hợp lệ.");
            }
        }

        var order = new Order(
            table.Id,
            orderCode,
            request.Note);

        if (request.CustomerUserId.HasValue)
            order.AssignCustomer(request.CustomerUserId.Value);

        await _context.Orders.AddAsync(order, cancellationToken);

        var orderItems = new List<OrderItem>();

        foreach (var requestItem in request.Items)
        {
            var menuItem = menuItems.First(x => x.Id == requestItem.MenuItemId);

            var orderItem = new OrderItem(
                order.Id,
                menuItem.Id,
                menuItem.Name,
                requestItem.Quantity,
                menuItem.Price,
                requestItem.Note);

            orderItems.Add(orderItem);
        }

        var totalAmount = orderItems.Sum(x => x.TotalPrice);

        order.UpdateTotalAmount(totalAmount);

        table.MarkOccupied();

        await _context.OrderItems.AddRangeAsync(orderItems, cancellationToken);

        await _context.SaveChangesAsync(cancellationToken);

        return new QrOrderDto
        {
            Id = order.Id,
            RestaurantTableId = order.RestaurantTableId,
            RestaurantTableName = table.Name,
            OrderCode = order.OrderCode,
            Status = order.Status,
            TotalAmount = order.TotalAmount,
            Note = order.Note,
            CreatedAt = order.CreatedAt,
            Items = orderItems.Select(x => new QrOrderItemDto
            {
                Id = x.Id,
                MenuItemId = x.MenuItemId,
                MenuItemName = x.MenuItemName,
                Quantity = x.Quantity,
                UnitPrice = x.UnitPrice,
                TotalPrice = x.TotalPrice,
                Status = x.Status,
                Note = x.Note
            }).ToList()
        };
    }

    private static string GenerateOrderCode()
    {
        return $"ORD-{DateTime.UtcNow:yyyyMMddHHmmssfff}";
    }
}
