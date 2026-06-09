namespace QuanLyNhaHang.Application.Features.TableOperations.DTOs;

public class TableOperationDto
{
    public Guid Id { get; set; }

    public string OperationCode { get; set; } = string.Empty;

    public string OperationType { get; set; } = string.Empty;

    public Guid SourceTableId { get; set; }

    public string SourceTableName { get; set; } = string.Empty;

    public Guid? TargetTableId { get; set; }

    public string? TargetTableName { get; set; }

    public Guid? SourceOrderId { get; set; }

    public Guid? TargetOrderId { get; set; }

    public string Status { get; set; } = string.Empty;

    public string? Note { get; set; }

    public DateTime CreatedAt { get; set; }

    public DateTime? CompletedAt { get; set; }

    public DateTime? UpdatedAt { get; set; }

    public List<TableOperationDetailDto> Details { get; set; } = new();
}