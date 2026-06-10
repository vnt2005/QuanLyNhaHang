using MediatR;
using QuanLyNhaHang.Application.Common.Models;
using QuanLyNhaHang.Application.Features.InventoryTransactions.DTOs;

namespace QuanLyNhaHang.Application.Features.InventoryTransactions.Queries.GetWithPaginatedList;

public class GetInventoryTransactionsWithPaginatedListQuery
    : IRequest<PaginatedList<InventoryTransactionDto>>
{
    public string? Keyword { get; set; }

    public Guid? IngredientId { get; set; }

    public string? TransactionType { get; set; }

    public string? Status { get; set; }

    public DateTime? FromDate { get; set; }

    public DateTime? ToDate { get; set; }

    public int PageNumber { get; set; } = 1;

    public int PageSize { get; set; } = 10;
}