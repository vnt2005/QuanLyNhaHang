using MediatR;
using QuanLyNhaHang.Application.Common.Models;
using QuanLyNhaHang.Application.Features.TableOperations.DTOs;

namespace QuanLyNhaHang.Application.Features.TableOperations.Queries.GetWithPaginatedList;

public class GetTableOperationsWithPaginatedListQuery : IRequest<PaginatedList<TableOperationDto>>
{
    public string? Keyword { get; set; }

    public string? OperationType { get; set; }

    public string? Status { get; set; }

    public int PageNumber { get; set; } = 1;

    public int PageSize { get; set; } = 10;
}