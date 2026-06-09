using MediatR;
using Microsoft.EntityFrameworkCore;
using QuanLyNhaHang.Application.Common.Interfaces;
using QuanLyNhaHang.Application.Features.TableOperations.DTOs;

namespace QuanLyNhaHang.Application.Features.TableOperations.Commands.Update;

public class UpdateTableOperationCommandHandler
    : IRequestHandler<UpdateTableOperationCommand, TableOperationDto>
{
    private readonly IApplicationDbContext _context;

    public UpdateTableOperationCommandHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<TableOperationDto> Handle(
        UpdateTableOperationCommand request,
        CancellationToken cancellationToken)
    {
        var operation = await _context.TableOperations
            .FirstOrDefaultAsync(x => x.Id == request.Id, cancellationToken);

        if (operation == null)
            throw new Exception("Không tìm thấy thao tác bàn.");

        operation.UpdateNote(request.Note);

        await _context.SaveChangesAsync(cancellationToken);

        return new TableOperationDto
        {
            Id = operation.Id,
            OperationCode = operation.OperationCode,
            OperationType = operation.OperationType,
            SourceTableId = operation.SourceTableId,
            TargetTableId = operation.TargetTableId,
            SourceOrderId = operation.SourceOrderId,
            TargetOrderId = operation.TargetOrderId,
            Status = operation.Status,
            Note = operation.Note,
            CreatedAt = operation.CreatedAt,
            CompletedAt = operation.CompletedAt,
            UpdatedAt = operation.UpdatedAt
        };
    }
}