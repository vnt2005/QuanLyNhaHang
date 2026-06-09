using MediatR;
using Microsoft.EntityFrameworkCore;
using QuanLyNhaHang.Application.Common.Interfaces;
using QuanLyNhaHang.Application.Features.TableOperations.DTOs;
using QuanLyNhaHang.Domain.Entities;

namespace QuanLyNhaHang.Application.Features.TableOperations.Commands.Create;

public class MergeTablesCommandHandler
    : IRequestHandler<MergeTablesCommand, TableOperationDto>
{
    private readonly IApplicationDbContext _context;

    public MergeTablesCommandHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<TableOperationDto> Handle(
        MergeTablesCommand request,
        CancellationToken cancellationToken)
    {
        if (request.SourceOrderId == request.TargetOrderId)
            throw new Exception("Order nguồn và order đích không được trùng nhau.");

        var sourceOrder = await _context.Orders
            .FirstOrDefaultAsync(x => x.Id == request.SourceOrderId, cancellationToken);

        if (sourceOrder == null)
            throw new Exception("Không tìm thấy order nguồn.");

        var targetOrder = await _context.Orders
            .FirstOrDefaultAsync(x => x.Id == request.TargetOrderId, cancellationToken);

        if (targetOrder == null)
            throw new Exception("Không tìm thấy order đích.");

        if (sourceOrder.Status == "Completed" || sourceOrder.Status == "Cancelled")
            throw new Exception("Order nguồn đã hoàn tất hoặc đã hủy, không thể gộp.");

        if (targetOrder.Status == "Completed" || targetOrder.Status == "Cancelled")
            throw new Exception("Order đích đã hoàn tất hoặc đã hủy, không thể gộp.");

        var sourceTable = await _context.RestaurantTables
            .FirstOrDefaultAsync(x => x.Id == sourceOrder.RestaurantTableId, cancellationToken);

        if (sourceTable == null)
            throw new Exception("Không tìm thấy bàn nguồn.");

        var targetTable = await _context.RestaurantTables
            .FirstOrDefaultAsync(x => x.Id == targetOrder.RestaurantTableId, cancellationToken);

        if (targetTable == null)
            throw new Exception("Không tìm thấy bàn đích.");

        var sourceItems = await _context.OrderItems
            .Where(x =>
                x.OrderId == sourceOrder.Id &&
                x.Status != "Cancelled")
            .ToListAsync(cancellationToken);

        if (!sourceItems.Any())
            throw new Exception("Order nguồn không có món để gộp.");

        var operation = new TableOperation(
            "Merge",
            sourceTable.Id,
            targetTable.Id,
            sourceOrder.Id,
            targetOrder.Id,
            request.Note);

        await _context.TableOperations.AddAsync(operation, cancellationToken);

        var details = new List<TableOperationDetail>();

        foreach (var item in sourceItems)
        {
            details.Add(new TableOperationDetail(
                operation.Id,
                sourceOrder.Id,
                targetOrder.Id,
                item.Id,
                item.MenuItemId,
                item.MenuItemName,
                item.Quantity,
                item.UnitPrice,
                item.TotalPrice,
                item.Note));

            item.ChangeOrder(targetOrder.Id);
        }

        await _context.TableOperationDetails.AddRangeAsync(details, cancellationToken);

        var targetItemsAfterMerge = await _context.OrderItems
            .Where(x =>
                x.OrderId == targetOrder.Id &&
                x.Status != "Cancelled")
            .ToListAsync(cancellationToken);

        var totalTargetAmount = targetItemsAfterMerge.Sum(x => x.TotalPrice) + sourceItems.Sum(x => x.TotalPrice);

        targetOrder.UpdateTotalAmount(totalTargetAmount);

        sourceOrder.UpdateTotalAmount(0);
        sourceOrder.Cancel();

        sourceTable.MarkAvailable();
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
}