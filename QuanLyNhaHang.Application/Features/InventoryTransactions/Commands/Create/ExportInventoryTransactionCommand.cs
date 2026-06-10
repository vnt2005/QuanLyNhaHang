using MediatR;
using QuanLyNhaHang.Application.Features.InventoryTransactions.DTOs;

namespace QuanLyNhaHang.Application.Features.InventoryTransactions.Commands.Create;

public class ExportInventoryTransactionCommand : IRequest<InventoryTransactionDto>
{
    public Guid IngredientId { get; set; }

    public decimal Quantity { get; set; }

    public string? Note { get; set; }
}