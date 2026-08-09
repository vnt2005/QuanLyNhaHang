using MediatR;
using Microsoft.EntityFrameworkCore;
using QuanLyNhaHang.Application.Common.Extensions;
using QuanLyNhaHang.Application.Common.Interfaces;
using QuanLyNhaHang.Application.Features.QrOrders.DTOs;

namespace QuanLyNhaHang.Application.Features.QrOrders.Queries.GetById;

public class GetQrOrderByIdQueryHandler
    : IRequestHandler<GetQrOrderByIdQuery, QrOrderDto?>
{
    private readonly IApplicationDbContext _context;

    public GetQrOrderByIdQueryHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<QrOrderDto?> Handle(
        GetQrOrderByIdQuery request,
        CancellationToken cancellationToken)
    {
        var token = request.Token.Trim();

        var tableContext = await (
            from qrCode in _context.TableQrCodes.AsNoTracking()
            join table in _context.RestaurantTables
                .AsNoTracking()
                .WhereOperational(_context)
                on qrCode.RestaurantTableId equals table.Id
            where qrCode.Token == token &&
                  qrCode.IsActive &&
                  qrCode.Status == "Active"
            select new
            {
                TableId = table.Id,
                TableName = table.Name
            })
            .FirstOrDefaultAsync(cancellationToken);

        if (tableContext == null)
            return null;

        var order = await _context.Orders
            .AsNoTracking()
            .Where(x =>
                x.Id == request.OrderId &&
                x.RestaurantTableId == tableContext.TableId &&
                x.IsActive)
            .Select(x => new QrOrderDto
            {
                Id = x.Id,
                RestaurantTableId = x.RestaurantTableId,
                RestaurantTableName = tableContext.TableName,
                OrderCode = x.OrderCode,
                Status = x.Status,
                TotalAmount = x.TotalAmount,
                Note = x.Note,
                CreatedAt = x.CreatedAt
            })
            .FirstOrDefaultAsync(cancellationToken);

        if (order == null)
            return null;

        order.Items = await _context.OrderItems
            .AsNoTracking()
            .Where(x => x.OrderId == order.Id)
            .OrderBy(x => x.CreatedAt)
            .Select(x => new QrOrderItemDto
            {
                Id = x.Id,
                MenuItemId = x.MenuItemId,
                MenuItemName = x.MenuItemName,
                Quantity = x.Quantity,
                UnitPrice = x.UnitPrice,
                TotalPrice = x.TotalPrice,
                Status = x.Status,
                Note = x.Note
            })
            .ToListAsync(cancellationToken);

        return order;
    }
}
