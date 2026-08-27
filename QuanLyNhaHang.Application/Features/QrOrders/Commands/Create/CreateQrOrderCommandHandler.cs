using MediatR;
using Microsoft.EntityFrameworkCore;
using QuanLyNhaHang.Application.Common.Constants;
using QuanLyNhaHang.Application.Common.Extensions;
using QuanLyNhaHang.Application.Common.Interfaces;
using QuanLyNhaHang.Application.Common.Notifications;
using QuanLyNhaHang.Application.Common.Orders;
using QuanLyNhaHang.Application.Features.Notifications.DTOs;
using QuanLyNhaHang.Application.Features.QrOrders.DTOs;
using QuanLyNhaHang.Domain.Entities;

namespace QuanLyNhaHang.Application.Features.QrOrders.Commands.Create;

public class CreateQrOrderCommandHandler
    : IRequestHandler<CreateQrOrderCommand, QrOrderDto>
{
    private readonly IApplicationDbContext _context;
    private readonly IAdminNotificationPublisher _notificationPublisher;

    public CreateQrOrderCommandHandler(
        IApplicationDbContext context,
        IAdminNotificationPublisher notificationPublisher)
    {
        _context = context;
        _notificationPublisher = notificationPublisher;
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

        ValidateItems(request.Items);

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

        var burstWindowStart = DateTime.UtcNow.Subtract(
            CustomerOrderLimits.DineInBurstWindow);
        var recentTableOrderCount = await _context.Orders
            .AsNoTracking()
            .CountAsync(
                x =>
                    x.RestaurantTableId == table.Id &&
                    x.OrderType == "DineIn" &&
                    x.Status != "Cancelled" &&
                    x.CreatedAt >= burstWindowStart,
                cancellationToken);

        if (recentTableOrderCount >=
            CustomerOrderLimits.MaxDineInOrdersPerBurstWindow)
        {
            throw new InvalidOperationException(
                $"Bàn này đã gửi {CustomerOrderLimits.MaxDineInOrdersPerBurstWindow} lượt gọi món " +
                "trong thời gian rất ngắn. Vui lòng chờ ít phút trước khi gửi thêm.");
        }

        var orderCode = GenerateOrderCode();

        if (request.CustomerUserId.HasValue)
        {
            var customerUserId = request.CustomerUserId.Value;
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

        var recipientUserIds = await _context.Users
            .AsNoTracking()
            .Where(user =>
                user.IsActive &&
                user.IsEmailVerified &&
                AdminNotificationAudience.OrderAndReservationRoles
                    .Contains(user.Role))
            .Select(user => user.Id)
            .ToListAsync(cancellationToken);

        var notifications = recipientUserIds
            .Select(userId => new Notification(
                userId,
                "Order.CreatedFromCustomer",
                "Đơn gọi món mới",
                $"{table.Name} vừa gửi {order.OrderCode} với " +
                $"{orderItems.Sum(item => item.Quantity)} món.",
                "info",
                "Đơn hàng",
                order.Id))
            .ToList();

        if (notifications.Count > 0)
        {
            await _context.Notifications.AddRangeAsync(
                notifications,
                cancellationToken);
        }

        await _context.SaveChangesAsync(cancellationToken);

        await _notificationPublisher.PublishAsync(
            notifications.Select(NotificationDto.FromEntity).ToArray(),
            cancellationToken);

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

    private static void ValidateItems(
        IReadOnlyCollection<CreateQrOrderItemCommand>? items)
    {
        if (items is null || items.Count == 0)
        {
            throw new ArgumentException(
                "Order phải có ít nhất một món.");
        }

        if (items.Count > CustomerOrderLimits.MaxOrderLines)
        {
            throw new ArgumentException(
                $"Một order không được vượt quá {CustomerOrderLimits.MaxOrderLines} dòng món.");
        }

        foreach (var item in items)
        {
            if (item.MenuItemId == Guid.Empty)
                throw new ArgumentException("Món ăn không hợp lệ.");

            if (item.Quantity <= 0 ||
                item.Quantity > CustomerOrderLimits.MaxQuantityPerMenuItem)
            {
                throw new ArgumentException(
                    $"Số lượng mỗi món phải từ 1 đến {CustomerOrderLimits.MaxQuantityPerMenuItem}.");
            }
        }

        var duplicatedItemOverLimit = items
            .GroupBy(x => x.MenuItemId)
            .Any(group =>
                group.Sum(x => x.Quantity) >
                CustomerOrderLimits.MaxQuantityPerMenuItem);

        if (duplicatedItemOverLimit)
        {
            throw new ArgumentException(
                $"Tổng số lượng của cùng một món không được vượt quá {CustomerOrderLimits.MaxQuantityPerMenuItem}.");
        }

        var totalQuantity = items.Sum(x => x.Quantity);
        if (totalQuantity > CustomerOrderLimits.MaxTotalQuantity)
        {
            throw new ArgumentException(
                $"Tổng số lượng món trong một order không được vượt quá {CustomerOrderLimits.MaxTotalQuantity}.");
        }
    }

    private static string GenerateOrderCode()
    {
        return $"ORD-{DateTime.UtcNow:yyyyMMddHHmmssfff}-" +
               Guid.NewGuid().ToString("N")[..8].ToUpperInvariant();
    }
}
