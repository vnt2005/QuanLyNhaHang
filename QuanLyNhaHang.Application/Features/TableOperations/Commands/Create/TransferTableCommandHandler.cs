using MediatR;
using Microsoft.EntityFrameworkCore;
using QuanLyNhaHang.Application.Common.Extensions;
using QuanLyNhaHang.Application.Common.Interfaces;
using QuanLyNhaHang.Application.Features.TableOperations.DTOs;
using QuanLyNhaHang.Domain.Entities;

namespace QuanLyNhaHang.Application.Features.TableOperations.Commands.Create;

public class TransferTableCommandHandler
    : IRequestHandler<TransferTableCommand, TableOperationDto>
{
    private readonly IApplicationDbContext _context;

    public TransferTableCommandHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<TableOperationDto> Handle(
        TransferTableCommand request,
        CancellationToken cancellationToken)
    {
        var order = await _context.Orders
            .FirstOrDefaultAsync(x => x.Id == request.SourceOrderId, cancellationToken);

        if (order == null)
            throw new Exception("Không tìm thấy order nguồn.");

        if (order.Status == "Completed" || order.Status == "Cancelled")
            throw new Exception("Order đã hoàn tất hoặc đã hủy, không thể chuyển bàn.");

        var sourceTable = await _context.RestaurantTables
            .FirstOrDefaultAsync(x => x.Id == order.RestaurantTableId, cancellationToken);

        if (sourceTable == null)
            throw new Exception("Không tìm thấy bàn nguồn.");

        var targetTable = await _context.RestaurantTables
            .WhereAvailableForTableOperation(_context)
            .FirstOrDefaultAsync(
                x => x.Id == request.TargetTableId,
                cancellationToken);

        if (targetTable == null)
        {
            throw new InvalidOperationException(
                "Bàn đích phải đang hoạt động, thuộc khu vực hoạt động, ở trạng thái trống và không có đơn chưa hoàn tất.");
        }

        if (sourceTable.Id == targetTable.Id)
            throw new Exception("Bàn nguồn và bàn đích không được trùng nhau.");

        var oldTableId = sourceTable.Id;

        order.ChangeRestaurantTable(targetTable.Id);

        sourceTable.MarkAvailable();
        targetTable.MarkOccupied();

        var operation = new TableOperation(
            "Transfer",
            oldTableId,
            targetTable.Id,
            order.Id,
            order.Id,
            request.Note);

        await _context.TableOperations.AddAsync(operation, cancellationToken);

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
            SourceOrderId = order.Id,
            TargetOrderId = order.Id,
            Status = operation.Status,
            Note = operation.Note,
            CreatedAt = operation.CreatedAt,
            CompletedAt = operation.CompletedAt,
            UpdatedAt = operation.UpdatedAt
        };
    }
}
