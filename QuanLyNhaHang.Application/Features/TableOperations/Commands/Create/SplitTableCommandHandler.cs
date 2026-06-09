using MediatR;
using Microsoft.EntityFrameworkCore;
using QuanLyNhaHang.Application.Common.Interfaces;
using QuanLyNhaHang.Application.Features.TableOperations.DTOs;
using QuanLyNhaHang.Domain.Entities;

namespace QuanLyNhaHang.Application.Features.TableOperations.Commands.Create;

public class SplitTableCommandHandler
    : IRequestHandler<SplitTableCommand, TableOperationDto>
{
    private readonly IApplicationDbContext _context;

    public SplitTableCommandHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<TableOperationDto> Handle(
        SplitTableCommand request,
        CancellationToken cancellationToken)
    {
        var sourceOrder = await _context.Orders
            .FirstOrDefaultAsync(x => x.Id == request.SourceOrderId, cancellationToken);

        if (sourceOrder == null)
            throw new Exception("Không tìm thấy order nguồn.");

        if (sourceOrder.Status == "Completed" || sourceOrder.Status == "Cancelled")
            throw new Exception("Order đã hoàn tất hoặc đã hủy, không thể tách bàn.");

        var sourceTable = await _context.RestaurantTables
            .FirstOrDefaultAsync(x => x.Id == sourceOrder.RestaurantTableId, cancellationToken);

        if (sourceTable == null)
            throw new Exception("Không tìm thấy bàn nguồn.");

        var targetTable = await _context.RestaurantTables
            .FirstOrDefaultAsync(x => x.Id == request.TargetTableId, cancellationToken);

        if (targetTable == null)
            throw new Exception("Không tìm thấy bàn đích.");

        if (sourceTable.Id == targetTable.Id)
            throw new Exception("Bàn nguồn và bàn đích không được trùng nhau.");

        if (targetTable.Status == "Occupied")
            throw new Exception("Bàn đích đang có khách, không thể tách sang.");

        if (request.Items == null || !request.Items.Any())
            throw new Exception("Phải chọn ít nhất một món để tách bàn.");

        foreach (var item in request.Items)
        {
            if (item.OrderItemId == Guid.Empty)
                throw new Exception("Món trong order không hợp lệ.");

            if (item.Quantity <= 0)
                throw new Exception("Số lượng tách phải lớn hơn 0.");
        }

        var splitItemIds = request.Items
            .Select(x => x.OrderItemId)
            .Distinct()
            .ToList();

        var sourceOrderItems = await _context.OrderItems
            .Where(x =>
                x.OrderId == sourceOrder.Id &&
                splitItemIds.Contains(x.Id) &&
                x.Status != "Cancelled")
            .ToListAsync(cancellationToken);

        if (sourceOrderItems.Count != splitItemIds.Count)
            throw new Exception("Có món không thuộc order nguồn hoặc đã bị hủy.");

        var targetOrder = new Order(
            targetTable.Id,
            GenerateOrderCode(),
            request.TargetOrderNote);

        await _context.Orders.AddAsync(targetOrder, cancellationToken);

        var operation = new TableOperation(
            "Split",
            sourceTable.Id,
            targetTable.Id,
            sourceOrder.Id,
            targetOrder.Id,
            request.Note);

        await _context.TableOperations.AddAsync(operation, cancellationToken);

        var details = new List<TableOperationDetail>();
        var newTargetItems = new List<OrderItem>();

        foreach (var splitItem in request.Items)
        {
            var sourceItem = sourceOrderItems.First(x => x.Id == splitItem.OrderItemId);

            if (splitItem.Quantity > sourceItem.Quantity)
                throw new Exception($"Số lượng tách của món {sourceItem.MenuItemName} không hợp lệ.");

            details.Add(new TableOperationDetail(
                operation.Id,
                sourceOrder.Id,
                targetOrder.Id,
                sourceItem.Id,
                sourceItem.MenuItemId,
                sourceItem.MenuItemName,
                splitItem.Quantity,
                sourceItem.UnitPrice,
                sourceItem.UnitPrice * splitItem.Quantity,
                sourceItem.Note));

            if (splitItem.Quantity == sourceItem.Quantity)
            {
                sourceItem.ChangeOrder(targetOrder.Id);
            }
            else
            {
                sourceItem.DecreaseQuantity(splitItem.Quantity);

                var newItem = new OrderItem(
                    targetOrder.Id,
                    sourceItem.MenuItemId,
                    sourceItem.MenuItemName,
                    splitItem.Quantity,
                    sourceItem.UnitPrice,
                    sourceItem.Note);

                newTargetItems.Add(newItem);
            }
        }

        if (newTargetItems.Any())
        {
            await _context.OrderItems.AddRangeAsync(newTargetItems, cancellationToken);
        }

        await _context.TableOperationDetails.AddRangeAsync(details, cancellationToken);

        var sourceRemainingItems = await _context.OrderItems
            .Where(x =>
                x.OrderId == sourceOrder.Id &&
                x.Status != "Cancelled")
            .ToListAsync(cancellationToken);

        var movedFullItemIds = request.Items
            .Where(x =>
            {
                var sourceItem = sourceOrderItems.First(i => i.Id == x.OrderItemId);
                return x.Quantity == sourceItem.Quantity;
            })
            .Select(x => x.OrderItemId)
            .ToList();

        var sourceTotal = sourceRemainingItems
            .Where(x => !movedFullItemIds.Contains(x.Id))
            .Sum(x => x.TotalPrice);

        var targetTotal =
            newTargetItems.Sum(x => x.TotalPrice) +
            sourceOrderItems
                .Where(x => movedFullItemIds.Contains(x.Id))
                .Sum(x => x.TotalPrice);

        sourceOrder.UpdateTotalAmount(sourceTotal);
        targetOrder.UpdateTotalAmount(targetTotal);

        if (sourceTotal <= 0)
        {
            sourceOrder.Cancel();
            sourceTable.MarkAvailable();
        }
        else
        {
            sourceTable.MarkOccupied();
        }

        targetTable.MarkOccupied();

        await _context.SaveChangesAsync(cancellationToken);

        return new TableOperationDto
        {
            Id = operation.Id,
            OperationCode = operation.OperationCode,
            OperationType = operation.OperationType,
            SourceTableId = sourceTable.Id,
            SourceTableName = sourceTable.Name,
            TargetTableId = targetTable.Id,
            TargetTableName = targetTable.Name,
            SourceOrderId = sourceOrder.Id,
            TargetOrderId = targetOrder.Id,
            Status = operation.Status,
            Note = operation.Note,
            CreatedAt = operation.CreatedAt,
            CompletedAt = operation.CompletedAt,
            UpdatedAt = operation.UpdatedAt,
            Details = details.Select(x => new TableOperationDetailDto
            {
                Id = x.Id,
                TableOperationId = x.TableOperationId,
                FromOrderId = x.FromOrderId,
                ToOrderId = x.ToOrderId,
                OrderItemId = x.OrderItemId,
                MenuItemId = x.MenuItemId,
                MenuItemName = x.MenuItemName,
                Quantity = x.Quantity,
                UnitPrice = x.UnitPrice,
                TotalPrice = x.TotalPrice,
                Note = x.Note,
                CreatedAt = x.CreatedAt
            }).ToList()
        };
    }

    private static string GenerateOrderCode()
    {
        return $"ORD-{DateTime.UtcNow:yyyyMMddHHmmssfff}";
    }
}