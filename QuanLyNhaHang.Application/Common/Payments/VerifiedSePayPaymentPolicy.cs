using Microsoft.EntityFrameworkCore;
using QuanLyNhaHang.Application.Common.Interfaces;
using QuanLyNhaHang.Domain.Entities;

namespace QuanLyNhaHang.Application.Common.Payments;

public static class VerifiedSePayPaymentPolicy
{
    public const string Provider = "SePay";
    public const string WebhookNotePrefix = "SePay | transactionId=";
    public const string ReferenceMarker = " | reference=";
    public const string GatewayMarker = " | gateway=";
    public const string AttemptMarker = " | attempt=";

    public static IQueryable<Payment> Apply(
        IQueryable<Payment> payments,
        IApplicationDbContext context)
    {
        return payments.Where(payment =>
            payment.Status == "Paid" &&
            payment.PaymentMethod == "BankTransfer" &&
            payment.Note != null &&
            payment.Note.StartsWith(WebhookNotePrefix) &&
            payment.Note.Contains(ReferenceMarker) &&
            payment.Note.Contains(GatewayMarker) &&
            payment.Note.Contains(AttemptMarker) &&
            context.PaymentAttempts.Any(attempt =>
                attempt.PaymentId == payment.Id &&
                attempt.OrderId == payment.OrderId &&
                attempt.Provider == Provider &&
                attempt.Status == PaymentAttempt.PaidStatus &&
                attempt.ProviderPaymentLinkId != null &&
                attempt.ProviderPaymentLinkId != string.Empty &&
                attempt.ProviderReference != null &&
                attempt.ProviderReference != string.Empty &&
                attempt.ProviderStatus == "PAID" &&
                attempt.Amount == payment.FinalAmount &&
                attempt.ReceivedAmount == payment.FinalAmount &&
                attempt.PaidAt != null &&
                payment.Note.Contains(attempt.ProviderReference)));
    }

    public static async Task<bool> IsVerifiedAsync(
        Payment payment,
        IApplicationDbContext context,
        CancellationToken cancellationToken)
    {
        if (payment.Status != "Paid" ||
            payment.PaymentMethod != "BankTransfer" ||
            string.IsNullOrWhiteSpace(payment.Note) ||
            !payment.Note.StartsWith(WebhookNotePrefix, StringComparison.Ordinal) ||
            !payment.Note.Contains(ReferenceMarker, StringComparison.Ordinal) ||
            !payment.Note.Contains(GatewayMarker, StringComparison.Ordinal) ||
            !payment.Note.Contains(AttemptMarker, StringComparison.Ordinal))
        {
            return false;
        }

        return await context.PaymentAttempts
            .AsNoTracking()
            .AnyAsync(attempt =>
                attempt.PaymentId == payment.Id &&
                attempt.OrderId == payment.OrderId &&
                attempt.Provider == Provider &&
                attempt.Status == PaymentAttempt.PaidStatus &&
                attempt.ProviderPaymentLinkId != null &&
                attempt.ProviderPaymentLinkId != string.Empty &&
                attempt.ProviderReference != null &&
                attempt.ProviderReference != string.Empty &&
                attempt.ProviderStatus == "PAID" &&
                attempt.Amount == payment.FinalAmount &&
                attempt.ReceivedAmount == payment.FinalAmount &&
                attempt.PaidAt != null &&
                payment.Note.Contains(attempt.ProviderReference),
                cancellationToken);
    }
}
