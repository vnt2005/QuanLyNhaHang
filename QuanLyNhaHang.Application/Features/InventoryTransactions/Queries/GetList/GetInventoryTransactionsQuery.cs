using MediatR;
using QuanLyNhaHang.Application.Features.InventoryTransactions.DTOs;

namespace QuanLyNhaHang.Application.Features.InventoryTransactions.Queries.GetList;

public class GetInventoryTransactionsQuery : IRequest<List<InventoryTransactionDto>>
{
    public Guid? IngredientId { get; set; }

    public string? TransactionType { get; set; }

    public string? Status { get; set; }

    public DateTime? FromDate { get; set; }

    public DateTime? ToDate { get; set; }
}