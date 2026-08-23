using Microsoft.EntityFrameworkCore;
using QuanLyNhaHang.Application.Common.Interfaces;
using QuanLyNhaHang.Domain.Entities;

namespace QuanLyNhaHang.Application.Features.CustomerPayments.Services;

public sealed record CustomerPaymentQuote(
    decimal Subtotal,
    decimal DiscountAmount,
    decimal ServiceChargeAmount,
    decimal VatAmount,
    int FinalAmount);

public sealed class CustomerPaymentQuoteService
{
    private readonly IApplicationDbContext _context;

    public CustomerPaymentQuoteService(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<CustomerPaymentQuote> CalculateAsync(
        Order order,
        CancellationToken cancellationToken)
    {
        var subtotal = decimal.Round(
            await _context.OrderItems
                .Where(item =>
                    item.OrderId == order.Id &&
                    item.Status != "Cancelled")
                .SumAsync(item => item.TotalPrice, cancellationToken),
            0,
            MidpointRounding.AwayFromZero);

        if (subtotal <= 0)
        {
            throw new InvalidOperationException(
                "Đơn hàng chưa có món hợp lệ để thanh toán.");
        }

        var promotionUsage = await _context.PromotionUsages
            .AsNoTracking()
            .FirstOrDefaultAsync(
                usage => usage.OrderId == order.Id &&
                         usage.Status == "Applied",
                cancellationToken);
        var discountAmount = decimal.Round(
            Math.Min(promotionUsage?.DiscountAmount ?? 0, subtotal),
            0,
            MidpointRounding.AwayFromZero);

        var settings = await _context.RestaurantSettings
            .AsNoTracking()
            .Where(item => item.IsActive)
            .OrderByDescending(item => item.UpdatedAt ?? item.CreatedAt)
            .FirstOrDefaultAsync(cancellationToken);

        var afterDiscount = subtotal - discountAmount;
        var serviceChargeAmount = order.OrderType == "DineIn"
            ? decimal.Round(
                afterDiscount *
                (settings?.ServiceChargePercent ?? 0) / 100m,
                0,
                MidpointRounding.AwayFromZero)
            : 0m;
        var vatAmount = decimal.Round(
            (afterDiscount + serviceChargeAmount) *
            (settings?.DefaultVatPercent ?? 0) / 100m,
            0,
            MidpointRounding.AwayFromZero);
        var final = afterDiscount + serviceChargeAmount + vatAmount;
        var finalAmount = checked((int)decimal.Round(
            final,
            0,
            MidpointRounding.AwayFromZero));

        if (finalAmount <= 0)
        {
            throw new InvalidOperationException(
                "Số tiền thanh toán phải lớn hơn 0.");
        }

        return new CustomerPaymentQuote(
            subtotal,
            discountAmount,
            serviceChargeAmount,
            vatAmount,
            finalAmount);
    }
}
