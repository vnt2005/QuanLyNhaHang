using MediatR;
using QuanLyNhaHang.Application.Features.TableOperations.DTOs;

namespace QuanLyNhaHang.Application.Features.TableOperations.Commands.Create;

public class MergeTablesCommand : IRequest<TableOperationDto>
{
    public Guid SourceOrderId { get; set; }

    public Guid TargetOrderId { get; set; }

    public string? Note { get; set; }
}