using MediatR;
using Microsoft.EntityFrameworkCore;
using QuanLyNhaHang.Application.Common.Interfaces;
using QuanLyNhaHang.Application.Features.TableOperations.DTOs;

namespace QuanLyNhaHang.Application.Features.TableOperations.Queries.GetById;

public class GetTableOperationByIdQueryHandler
    : IRequestHandler<GetTableOperationByIdQuery, TableOperationDto?>
{
    private readonly IApplicationDbContext _context;

    public GetTableOperationByIdQueryHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<TableOperationDto?> Handle(
        GetTableOperationByIdQuery request,
        CancellationToken cancellationToken)
    {
        var operation = await _context.TableOperations
            .AsNoTracking()
            .FirstOrDefaultAsync(x => x.Id == request.Id, cancellationToken);

        if (operation == null)
            return null;

        var sourceTable = await _context.RestaurantTables
            .AsNoTracking()
            .FirstOrDefaultAsync(x => x.Id == operation.SourceTableId, cancellationToken);

        var targetTable = operation.TargetTableId.HasValue
            ? await _context.RestaurantTables
                .AsNoTracking()
                .FirstOrDefaultAsync(x => x.Id == operation.TargetTableId.Value, cancellationToken)
            : null;

        var details = await _context.TableOperationDetails
            .AsNoTracking()
            .Where(x => x.TableOperationId == operation.Id)
            .Select(x => new TableOperationDetailDto
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
            })
            .ToListAsync(cancellationToken);

        return new TableOperationDto
        {
            Id = operation.Id,
            OperationCode = operation.OperationCode,
            OperationType = operation.OperationType,
            SourceTableId = operation.SourceTableId,
            SourceTableName = sourceTable?.Name ?? string.Empty,
            TargetTableId = operation.TargetTableId,
            TargetTableName = targetTable?.Name,
            SourceOrderId = operation.SourceOrderId,
            TargetOrderId = operation.TargetOrderId,
            Status = operation.Status,
            Note = operation.Note,
            CreatedAt = operation.CreatedAt,
            CompletedAt = operation.CompletedAt,
            UpdatedAt = operation.UpdatedAt,
            Details = details
        };
    }
}