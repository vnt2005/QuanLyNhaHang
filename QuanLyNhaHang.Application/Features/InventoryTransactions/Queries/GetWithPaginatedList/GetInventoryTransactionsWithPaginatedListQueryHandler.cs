using MediatR;
using Microsoft.EntityFrameworkCore;
using QuanLyNhaHang.Application.Common.Interfaces;
using QuanLyNhaHang.Application.Common.Models;
using QuanLyNhaHang.Application.Common.Time;
using QuanLyNhaHang.Application.Features.InventoryTransactions.DTOs;

namespace QuanLyNhaHang.Application.Features.InventoryTransactions.Queries.GetWithPaginatedList;

public class GetInventoryTransactionsWithPaginatedListQueryHandler
    : IRequestHandler<GetInventoryTransactionsWithPaginatedListQuery, PaginatedList<InventoryTransactionDto>>
{
    private readonly IApplicationDbContext _context;

    public GetInventoryTransactionsWithPaginatedListQueryHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<PaginatedList<InventoryTransactionDto>> Handle(
        GetInventoryTransactionsWithPaginatedListQuery request,
        CancellationToken cancellationToken)
    {
        var query =
            from transaction in _context.InventoryTransactions.AsNoTracking()
            join ingredient in _context.Ingredients.AsNoTracking()
                on transaction.IngredientId equals ingredient.Id into ingredientGroup
            from ingredient in ingredientGroup.DefaultIfEmpty()
            select new
            {
                Transaction = transaction,
                Ingredient = ingredient
            };

        if (!string.IsNullOrWhiteSpace(request.Keyword))
        {
            var keyword = request.Keyword.Trim();
            query = query.Where(x =>
                x.Transaction.TransactionCode.Contains(keyword) ||
                x.Transaction.TransactionType.Contains(keyword) ||
                x.Transaction.Status.Contains(keyword) ||
                (x.Transaction.Note != null && x.Transaction.Note.Contains(keyword)) ||
                (x.Ingredient != null && x.Ingredient.IngredientCode.Contains(keyword)) ||
                (x.Ingredient != null && x.Ingredient.Name.Contains(keyword)));
        }

        if (request.IngredientId.HasValue)
            query = query.Where(x => x.Transaction.IngredientId == request.IngredientId.Value);

        if (!string.IsNullOrWhiteSpace(request.TransactionType))
        {
            var transactionType = request.TransactionType.Trim();
            query = query.Where(x => x.Transaction.TransactionType == transactionType);
        }

        if (!string.IsNullOrWhiteSpace(request.Status))
        {
            var status = request.Status.Trim();
            query = query.Where(x => x.Transaction.Status == status);
        }

        if (request.FromDate.HasValue)
        {
            var fromUtc = RestaurantTime.GetUtcStart(request.FromDate.Value);
            query = query.Where(x => x.Transaction.TransactionDate >= fromUtc);
        }

        if (request.ToDate.HasValue)
        {
            var toUtcExclusive = RestaurantTime.GetUtcEndExclusive(request.ToDate.Value);
            query = query.Where(x => x.Transaction.TransactionDate < toUtcExclusive);
        }

        var inventoryTransactionDtos = query
            .OrderByDescending(x => x.Transaction.TransactionDate)
            .Select(x => new InventoryTransactionDto
            {
                Id = x.Transaction.Id,
                TransactionCode = x.Transaction.TransactionCode,
                IngredientId = x.Transaction.IngredientId,
                IngredientCode = x.Ingredient != null ? x.Ingredient.IngredientCode : string.Empty,
                IngredientName = x.Ingredient != null ? x.Ingredient.Name : string.Empty,
                IngredientUnit = x.Ingredient != null ? x.Ingredient.Unit : string.Empty,
                TransactionType = x.Transaction.TransactionType,
                Quantity = x.Transaction.Quantity,
                UnitPrice = x.Transaction.UnitPrice,
                TotalAmount = x.Transaction.TotalAmount,
                StockBefore = x.Transaction.StockBefore,
                StockAfter = x.Transaction.StockAfter,
                Status = x.Transaction.Status,
                Note = x.Transaction.Note,
                TransactionDate = x.Transaction.TransactionDate,
                CreatedAt = x.Transaction.CreatedAt,
                CancelledAt = x.Transaction.CancelledAt
            });

        return await PaginatedList<InventoryTransactionDto>.CreateAsync(
            inventoryTransactionDtos,
            request.PageNumber,
            request.PageSize);
    }
}
