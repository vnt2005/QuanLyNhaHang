using MediatR;
using Microsoft.EntityFrameworkCore;
using QuanLyNhaHang.Application.Common.Interfaces;
using QuanLyNhaHang.Application.Features.InventoryTransactions.DTOs;

namespace QuanLyNhaHang.Application.Features.InventoryTransactions.Queries.GetById;

public class GetInventoryTransactionByIdQueryHandler
    : IRequestHandler<GetInventoryTransactionByIdQuery, InventoryTransactionDto?>
{
    private readonly IApplicationDbContext _context;

    public GetInventoryTransactionByIdQueryHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<InventoryTransactionDto?> Handle(
        GetInventoryTransactionByIdQuery request,
        CancellationToken cancellationToken)
    {
        var result = await (
            from transaction in _context.InventoryTransactions.AsNoTracking()
            join ingredient in _context.Ingredients.AsNoTracking()
                on transaction.IngredientId equals ingredient.Id into ingredientGroup
            from ingredient in ingredientGroup.DefaultIfEmpty()
            where transaction.Id == request.Id
            select new InventoryTransactionDto
            {
                Id = transaction.Id,
                TransactionCode = transaction.TransactionCode,
                IngredientId = transaction.IngredientId,
                IngredientCode = ingredient != null ? ingredient.IngredientCode : string.Empty,
                IngredientName = ingredient != null ? ingredient.Name : string.Empty,
                IngredientUnit = ingredient != null ? ingredient.Unit : string.Empty,
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
            })
            .FirstOrDefaultAsync(cancellationToken);

        return result;
    }
}