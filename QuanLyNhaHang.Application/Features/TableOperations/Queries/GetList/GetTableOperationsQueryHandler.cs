using MediatR;
using Microsoft.EntityFrameworkCore;
using QuanLyNhaHang.Application.Common.Interfaces;
using QuanLyNhaHang.Application.Features.TableOperations.DTOs;

namespace QuanLyNhaHang.Application.Features.TableOperations.Queries.GetList;

public class GetTableOperationsQueryHandler
    : IRequestHandler<GetTableOperationsQuery, List<TableOperationDto>>
{
    private readonly IApplicationDbContext _context;

    public GetTableOperationsQueryHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<List<TableOperationDto>> Handle(
        GetTableOperationsQuery request,
        CancellationToken cancellationToken)
    {
        var query = _context.TableOperations
            .AsNoTracking()
            .AsQueryable();

        if (!string.IsNullOrWhiteSpace(request.OperationType))
        {
            query = query.Where(x => x.OperationType == request.OperationType);
        }

        if (!string.IsNullOrWhiteSpace(request.Status))
        {
            query = query.Where(x => x.Status == request.Status);
        }

        var operations = await query
            .OrderByDescending(x => x.CreatedAt)
            .ToListAsync(cancellationToken);

        var tableIds = operations
            .Select(x => x.SourceTableId)
            .Concat(operations.Where(x => x.TargetTableId.HasValue).Select(x => x.TargetTableId!.Value))
            .Distinct()
            .ToList();

        var tables = await _context.RestaurantTables
            .AsNoTracking()
            .Where(x => tableIds.Contains(x.Id))
            .ToListAsync(cancellationToken);

        return operations.Select(x => new TableOperationDto
        {
            Id = x.Id,
            OperationCode = x.OperationCode,
            OperationType = x.OperationType,
            SourceTableId = x.SourceTableId,
            SourceTableName = tables.FirstOrDefault(t => t.Id == x.SourceTableId)?.Name ?? string.Empty,
            TargetTableId = x.TargetTableId,
            TargetTableName = x.TargetTableId.HasValue
                ? tables.FirstOrDefault(t => t.Id == x.TargetTableId.Value)?.Name
                : null,
            SourceOrderId = x.SourceOrderId,
            TargetOrderId = x.TargetOrderId,
            Status = x.Status,
            Note = x.Note,
            CreatedAt = x.CreatedAt,
            CompletedAt = x.CompletedAt,
            UpdatedAt = x.UpdatedAt
        }).ToList();
    }
}