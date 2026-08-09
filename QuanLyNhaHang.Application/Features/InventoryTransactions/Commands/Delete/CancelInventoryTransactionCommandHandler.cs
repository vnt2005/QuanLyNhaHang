using MediatR;
using Microsoft.EntityFrameworkCore;
using QuanLyNhaHang.Application.Common.Interfaces;

namespace QuanLyNhaHang.Application.Features.InventoryTransactions.Commands.Delete;

public class CancelInventoryTransactionCommandHandler
    : IRequestHandler<CancelInventoryTransactionCommand, bool>
{
    private readonly IApplicationDbContext _context;

    public CancelInventoryTransactionCommandHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<bool> Handle(
        CancelInventoryTransactionCommand request,
        CancellationToken cancellationToken)
    {
        var transaction = await _context.InventoryTransactions
            .FirstOrDefaultAsync(x => x.Id == request.Id, cancellationToken);

        if (transaction == null)
            throw new Exception("Không tìm thấy giao dịch tồn kho.");

        if (transaction.Status == "Cancelled")
            throw new Exception("Giao dịch tồn kho đã được hủy trước đó.");

        var ingredient = await _context.Ingredients
            .FirstOrDefaultAsync(x => x.Id == transaction.IngredientId, cancellationToken);

        if (ingredient == null)
            throw new Exception("Không tìm thấy nguyên liệu của giao dịch tồn kho.");

        if (ingredient.CurrentStock != transaction.StockAfter)
        {
            throw new InvalidOperationException(
                "Không thể hủy giao dịch vì tồn kho đã thay đổi sau giao dịch này. " +
                "Hãy hủy các giao dịch mới hơn trước.");
        }

        if (transaction.TransactionType == "Import")
        {
            ingredient.ExportStock(transaction.Quantity);
        }
        else if (transaction.TransactionType == "Export")
        {
            ingredient.ImportStock(transaction.Quantity);
        }
        else if (transaction.TransactionType == "Adjustment")
        {
            ingredient.AdjustStock(transaction.StockBefore);
        }
        else
        {
            throw new Exception("Loại giao dịch tồn kho không hợp lệ.");
        }

        transaction.Cancel();

        await _context.SaveChangesAsync(cancellationToken);

        return true;
    }
}