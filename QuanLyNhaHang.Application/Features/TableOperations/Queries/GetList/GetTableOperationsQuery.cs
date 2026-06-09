using MediatR;
using QuanLyNhaHang.Application.Features.TableOperations.DTOs;

namespace QuanLyNhaHang.Application.Features.TableOperations.Queries.GetList;

public class GetTableOperationsQuery : IRequest<List<TableOperationDto>>
{
    public string? OperationType { get; set; }

    public string? Status { get; set; }
}