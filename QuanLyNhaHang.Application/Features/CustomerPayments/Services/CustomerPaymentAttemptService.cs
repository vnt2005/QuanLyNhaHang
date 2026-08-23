using System.Security.Cryptography;
using Microsoft.EntityFrameworkCore;
using QuanLyNhaHang.Application.Common.Interfaces;
using QuanLyNhaHang.Application.Common.Payments;
using QuanLyNhaHang.Application.Features.CustomerPayments.DTOs;
using QuanLyNhaHang.Domain.Entities;

namespace QuanLyNhaHang.Application.Features.CustomerPayments.Services;

public sealed class CustomerPaymentAttemptService
{
    private static readonly TimeSpan CreatingAttemptGracePeriod = TimeSpan.FromMinutes(1);

    private readonly IApplicationDbContext _context;
    private readonly IPaymentGateway _paymentGateway;

    public CustomerPaymentAttemptService(
        IApplicationDbContext context,
        IPaymentGateway paymentGateway)
    {
        _context = context;
        _paymentGateway = paymentGateway;
    }

    public async Task<CustomerPaymentResult<CustomerPaymentInstructionDto>?>
        ReconcileOpenAttemptsAsync(
            Order order,
            CustomerPaymentQuote quote,
            CancellationToken cancellationToken)
    {
        var now = DateTime.UtcNow;
        var attempts = await _context.PaymentAttempts
            .Where(item => item.OrderId == order.Id &&
                           item.Provider == _paymentGateway.Provider &&
                           (item.Status == PaymentAttempt.CreatingStatus ||
                            item.Status == PaymentAttempt.PendingStatus))
            .OrderByDescending(item => item.CreatedAt)
            .ToListAsync(cancellationToken);

        var changed = false;
        foreach (var attempt in attempts)
        {
            if (attempt.ExpiresAt <= now)
            {
                attempt.MarkExpired();
                changed = true;
                continue;
            }

            if (attempt.Status == PaymentAttempt.CreatingStatus)
            {
                if (attempt.CreatedAt > now.Subtract(CreatingAttemptGracePeriod))
                {
                    if (changed)
                        await _context.SaveChangesAsync(cancellationToken);

                    return CustomerPaymentResult<CustomerPaymentInstructionDto>.Conflict(
                        "Một phiên thanh toán đang được tạo. Vui lòng thử lại sau ít phút.",
                        attemptId: attempt.Id,
                        attemptStatus: attempt.Status);
                }

                attempt.MarkFailed(
                    "Payment instruction creation was interrupted.");
                changed = true;
                continue;
            }

            if (string.IsNullOrWhiteSpace(attempt.ProviderPaymentLinkId))
            {
                attempt.MarkFailed(
                    "Payment attempt is pending but has no transfer content.");
                changed = true;
                continue;
            }

            var instruction = _paymentGateway.CreatePaymentInstruction(
                attempt.ProviderOrderCode,
                checked((int)attempt.Amount));

            if (!string.Equals(
                    instruction.PaymentCode,
                    attempt.ProviderPaymentLinkId,
                    StringComparison.OrdinalIgnoreCase))
            {
                attempt.MarkCancelled(
                    "Payment prefix configuration changed; a new QR is required.");
                changed = true;
                continue;
            }

            if (attempt.Amount == quote.FinalAmount)
            {
                if (changed)
                    await _context.SaveChangesAsync(cancellationToken);

                return CustomerPaymentResult<CustomerPaymentInstructionDto>.Success(
                    BuildInstructionDto(
                        order,
                        attempt,
                        instruction,
                        quote,
                        reused: true));
            }

            attempt.MarkCancelled(
                "Payment QR was superseded because the order amount changed.");
            changed = true;
        }

        if (changed)
            await _context.SaveChangesAsync(cancellationToken);

        return null;
    }

    public PaymentInstruction? BuildInstruction(
        PaymentAttempt? attempt,
        bool paymentChannelReady)
    {
        if (attempt == null ||
            !paymentChannelReady ||
            !_paymentGateway.IsConfigured ||
            attempt.Status != PaymentAttempt.PendingStatus ||
            attempt.Amount <= 0 ||
            attempt.Amount > int.MaxValue ||
            string.IsNullOrWhiteSpace(attempt.ProviderPaymentLinkId))
        {
            return null;
        }

        var instruction = _paymentGateway.CreatePaymentInstruction(
            attempt.ProviderOrderCode,
            checked((int)attempt.Amount));

        return string.Equals(
            instruction.PaymentCode,
            attempt.ProviderPaymentLinkId,
            StringComparison.OrdinalIgnoreCase)
            ? instruction
            : null;
    }

    public async Task<long> CreateProviderOrderCodeAsync(
        CancellationToken cancellationToken)
    {
        for (var attempt = 0; attempt < 12; attempt++)
        {
            var code = RandomNumberGenerator.GetInt32(
                1_000_000,
                10_000_000);
            var exists = await _context.PaymentAttempts
                .AsNoTracking()
                .AnyAsync(
                    item => item.Provider == _paymentGateway.Provider &&
                            item.ProviderOrderCode == code,
                    cancellationToken);

            if (!exists)
                return code;
        }

        throw new InvalidOperationException(
            "Không tạo được mã giao dịch thanh toán duy nhất.");
    }

    public CustomerPaymentInstructionDto BuildInstructionDto(
        Order order,
        PaymentAttempt attempt,
        PaymentInstruction instruction,
        CustomerPaymentQuote quote,
        bool reused)
        => new()
        {
            AlreadyPaid = false,
            Reused = reused ? true : null,
            OrderId = order.Id,
            OrderCode = order.OrderCode,
            AttemptId = attempt.Id,
            AttemptStatus = attempt.Status,
            ExpiresAt = attempt.ExpiresAt,
            QrCode = instruction.QrCodeUrl,
            TransferContent = instruction.PaymentCode,
            BankCode = instruction.BankCode,
            AccountNumber = instruction.AccountNumber,
            AccountHolder = instruction.AccountHolder,
            Amount = quote.FinalAmount,
            Subtotal = quote.Subtotal,
            DiscountAmount = quote.DiscountAmount,
            ServiceChargeAmount = quote.ServiceChargeAmount,
            VatAmount = quote.VatAmount,
            PaymentMethod = _paymentGateway.Provider
        };
}
