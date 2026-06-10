using MediatR;
using QuanLyNhaHang.Application.Features.InventoryTransactions.DTOs;

namespace QuanLyNhaHang.Application.Features.InventoryTransactions.Queries.GetById;

public class GetInventoryTransactionByIdQuery : IRequest<InventoryTransactionDto?>
{
    public Guid Id { get; set; }
}