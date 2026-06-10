using MediatR;
using Microsoft.EntityFrameworkCore;
using QuanLyNhaHang.Application.Common.Interfaces;
using QuanLyNhaHang.Application.Features.InventoryTransactions.DTOs;
using QuanLyNhaHang.Domain.Entities;

namespace QuanLyNhaHang.Application.Features.InventoryTransactions.Commands.Create;

public class ExportInventoryTransactionCommandHandler
    : IRequestHandler<ExportInventoryTransactionCommand, InventoryTransactionDto>
{
    private readonly IApplicationDbContext _context;

    public ExportInventoryTransactionCommandHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<InventoryTransactionDto> Handle(
        ExportInventoryTransactionCommand request,
        CancellationToken cancellationToken)
    {
        var ingredient = await _context.Ingredients
            .FirstOrDefaultAsync(x => x.Id == request.IngredientId, cancellationToken);

        if (ingredient == null)
            throw new Exception("Không tìm thấy nguyên liệu.");

        if (!ingredient.IsActive)
            throw new Exception("Nguyên liệu đã bị vô hiệu hóa.");

        var stockBefore = ingredient.CurrentStock;

        ingredient.ExportStock(request.Quantity);

        var stockAfter = ingredient.CurrentStock;

        var transaction = new InventoryTransaction(
            ingredient.Id,
            "Export",
            request.Quantity,
            ingredient.CostPrice,
            stockBefore,
            stockAfter,
            request.Note);

        await _context.InventoryTransactions.AddAsync(transaction, cancellationToken);

        await _context.SaveChangesAsync(cancellationToken);

        return new InventoryTransactionDto
        {
            Id = transaction.Id,
            TransactionCode = transaction.TransactionCode,
            IngredientId = transaction.IngredientId,
            IngredientCode = ingredient.IngredientCode,
            IngredientName = ingredient.Name,
            IngredientUnit = ingredient.Unit,
            TransactionType = transaction.TransactionType,
            Quantity = transaction.Quantity,
            UnitPrice = transaction.UnitPrice,
            TotalAmount = transaction.TotalAmount,
            StockBefore = transaction.StockBefore,
            StockAfter = transaction.StockAfter,
            Status = transaction.Status,
            Note = transaction.Note,
            TransactionDate = transaction.TransactionDate,
            CreatedAt = transaction.CreatedAt,
            CancelledAt = transaction.CancelledAt
        };
    }
}