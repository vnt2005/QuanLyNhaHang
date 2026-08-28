using MediatR;
using Microsoft.EntityFrameworkCore;
using QuanLyNhaHang.Application.Common.Constants;
using QuanLyNhaHang.Application.Common.Interfaces;
using QuanLyNhaHang.Application.Common.Notifications;
using QuanLyNhaHang.Application.Common.Orders;
using QuanLyNhaHang.Application.Features.Notifications.DTOs;
using QuanLyNhaHang.Application.Features.QrOrders.Commands.Create;
using QuanLyNhaHang.Application.Features.QrOrders.DTOs;
using QuanLyNhaHang.Domain.Entities;

namespace QuanLyNhaHang.Application.Features.CustomerOrders.Commands.CreateTakeaway;

public sealed class CreateTakeawayOrderCommandHandler
    : IRequestHandler<CreateTakeawayOrderCommand, QrOrderDto>
{
    private readonly IApplicationDbContext _context;
    private readonly IAdminNotificationPublisher _notificationPublisher;

    public CreateTakeawayOrderCommandHandler(
        IApplicationDbContext context,
        IAdminNotificationPublisher notificationPublisher)
    {
        _context = context;
        _notificationPublisher = notificationPublisher;
    }

    public async Task<QrOrderDto> Handle(
        CreateTakeawayOrderCommand request,
        CancellationToken cancellationToken)
    {
        ValidateItems(request.Items);

        if (string.IsNullOrWhiteSpace(request.CustomerName))
            throw new ArgumentException("Vui lòng nhập tên người nhận món.");

        if (string.IsNullOrWhiteSpace(request.PhoneNumber))
            throw new ArgumentException("Vui lòng nhập số điện thoại người nhận món.");

        if (request.CustomerName.Trim().Length > 150)
            throw new ArgumentException("Tên người nhận không được vượt quá 150 ký tự.");

        if (request.PhoneNumber.Trim().Length > 30)
            throw new ArgumentException("Số điện thoại không được vượt quá 30 ký tự.");

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
            throw new InvalidOperationException("Có món không tồn tại hoặc hiện không phục vụ.");

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
                throw new UnauthorizedAccessException("Tài khoản khách hàng không còn hợp lệ.");
        }

        var recentWindowStart = DateTime.UtcNow.Subtract(
            CustomerOrderLimits.TakeawayDuplicateWindow);
        var normalizedPhoneNumber = request.PhoneNumber.Trim();

        var recentOpenTakeawayOrders = _context.Orders
            .AsNoTracking()
            .Where(x =>
                x.OrderType == "Takeaway" &&
                x.Status != "Completed" &&
                x.Status != "Cancelled" &&
                x.CreatedAt >= recentWindowStart &&
                !_context.Payments.Any(payment =>
                    payment.OrderId == x.Id &&
                    payment.Status == "Paid"));

        var hasRecentOpenTakeaway = request.CustomerUserId.HasValue
            ? await recentOpenTakeawayOrders.AnyAsync(
                x => x.CustomerUserId == request.CustomerUserId.Value,
                cancellationToken)
            : await recentOpenTakeawayOrders.AnyAsync(
                x => x.CustomerPhoneNumber == normalizedPhoneNumber,
                cancellationToken);

        if (hasRecentOpenTakeaway)
        {
            throw new InvalidOperationException(
                "Bạn đang có một đơn mang về chưa hoàn tất trong 30 phút gần đây. " +
                "Vui lòng hoàn tất thanh toán hoặc chờ nhân viên xử lý đơn hiện tại trước khi tạo đơn mới.");
        }

        var order = Order.CreateTakeaway(
            GenerateOrderCode(),
            request.CustomerName,
            request.PhoneNumber,
            request.PickupTime,
            request.Note);

        if (request.CustomerUserId.HasValue)
            order.AssignCustomer(request.CustomerUserId.Value);

        await _context.Orders.AddAsync(order, cancellationToken);

        var orderItems = request.Items.Select(requestItem =>
        {
            var menuItem = menuItems.First(x => x.Id == requestItem.MenuItemId);
            return new OrderItem(
                order.Id,
                menuItem.Id,
                menuItem.Name,
                requestItem.Quantity,
                menuItem.Price,
                requestItem.Note);
        }).ToList();

        order.UpdateTotalAmount(orderItems.Sum(x => x.TotalPrice));
        await _context.OrderItems.AddRangeAsync(orderItems, cancellationToken);

        var recipientUserIds = await _context.Users
            .AsNoTracking()
            .Where(user =>
                user.IsActive &&
                user.IsEmailVerified &&
                AdminNotificationAudience.OrderAndReservationRoles.Contains(user.Role))
            .Select(user => user.Id)
            .ToListAsync(cancellationToken);

        var pickupLabel = order.PickupTime.HasValue
            ? $" - nhận lúc {order.PickupTime.Value.ToLocalTime():HH:mm dd/MM}"
            : string.Empty;

        var notifications = recipientUserIds
            .Select(userId => new Notification(
                userId,
                "Order.CreatedFromCustomer",
                "Đơn mang về mới",
                $"{order.CustomerName} vừa đặt {order.OrderCode} với " +
                $"{orderItems.Sum(item => item.Quantity)} món{pickupLabel}.",
                "info",
                "Đơn hàng",
                order.Id))
            .ToList();

        if (notifications.Count > 0)
            await _context.Notifications.AddRangeAsync(notifications, cancellationToken);

        await _context.SaveChangesAsync(cancellationToken);

        await _notificationPublisher.PublishAsync(
            notifications.Select(NotificationDto.FromEntity).ToArray(),
            cancellationToken);

        return new QrOrderDto
        {
            Id = order.Id,
            RestaurantTableId = null,
            RestaurantTableName = "Mang về",
            OrderType = order.OrderType,
            CustomerName = order.CustomerName,
            CustomerPhoneNumber = order.CustomerPhoneNumber,
            PickupTime = order.PickupTime,
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
            throw new ArgumentException("Đơn mang về phải có ít nhất một món.");

        if (items.Count > CustomerOrderLimits.MaxOrderLines)
        {
            throw new ArgumentException(
                $"Một đơn không được vượt quá {CustomerOrderLimits.MaxOrderLines} dòng món.");
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
                $"Tổng số lượng món trong một đơn không được vượt quá {CustomerOrderLimits.MaxTotalQuantity}.");
        }
    }

    private static string GenerateOrderCode()
        => $"ORD-{DateTime.UtcNow:yyyyMMddHHmmssfff}-" +
           Guid.NewGuid().ToString("N")[..8].ToUpperInvariant();
}
