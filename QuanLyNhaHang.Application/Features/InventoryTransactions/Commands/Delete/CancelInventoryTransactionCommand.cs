using MediatR;

namespace QuanLyNhaHang.Application.Features.InventoryTransactions.Commands.Delete;

public class CancelInventoryTransactionCommand : IRequest<bool>
{
    public Guid Id { get; set; }
}