using MediatR;
using Microsoft.EntityFrameworkCore;
using QuanLyNhaHang.Application.Common.Interfaces;
using QuanLyNhaHang.Application.Common.Models;
using QuanLyNhaHang.Application.Features.TableOperations.DTOs;

namespace QuanLyNhaHang.Application.Features.TableOperations.Queries.GetWithPaginatedList;

public class GetTableOperationsWithPaginatedListQueryHandler
    : IRequestHandler<GetTableOperationsWithPaginatedListQuery, PaginatedList<TableOperationDto>>
{
    private readonly IApplicationDbContext _context;

    public GetTableOperationsWithPaginatedListQueryHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<PaginatedList<TableOperationDto>> Handle(
        GetTableOperationsWithPaginatedListQuery request,
        CancellationToken cancellationToken)
    {
        var query = _context.TableOperations
            .AsNoTracking()
            .AsQueryable();

        if (!string.IsNullOrWhiteSpace(request.Keyword))
        {
            var keyword = request.Keyword.Trim();

            query = query.Where(x =>
                x.OperationCode.Contains(keyword) ||
                x.OperationType.Contains(keyword) ||
                x.Status.Contains(keyword));
        }

        if (!string.IsNullOrWhiteSpace(request.OperationType))
        {
            query = query.Where(x => x.OperationType == request.OperationType);
        }

        if (!string.IsNullOrWhiteSpace(request.Status))
        {
            query = query.Where(x => x.Status == request.Status);
        }

        var operationDtos = query
            .OrderByDescending(x => x.CreatedAt)
            .Select(x => new TableOperationDto
            {
                Id = x.Id,
                OperationCode = x.OperationCode,
                OperationType = x.OperationType,
                SourceTableId = x.SourceTableId,
                TargetTableId = x.TargetTableId,
                SourceOrderId = x.SourceOrderId,
                TargetOrderId = x.TargetOrderId,
                Status = x.Status,
                Note = x.Note,
                CreatedAt = x.CreatedAt,
                CompletedAt = x.CompletedAt,
                UpdatedAt = x.UpdatedAt
            });

        return await PaginatedList<TableOperationDto>.CreateAsync(
            operationDtos,
            request.PageNumber,
            request.PageSize);
    }
}