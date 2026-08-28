using System.Globalization;
using MediatR;
using Microsoft.EntityFrameworkCore;
using QuanLyNhaHang.Application.Common.Interfaces;
using QuanLyNhaHang.Application.Common.Notifications;
using QuanLyNhaHang.Application.Common.Payments;
using QuanLyNhaHang.Application.Features.CustomerPayments.DTOs;
using QuanLyNhaHang.Application.Features.CustomerPayments.Services;
using QuanLyNhaHang.Application.Features.Notifications.DTOs;
using QuanLyNhaHang.Domain.Entities;

namespace QuanLyNhaHang.Application.Features.CustomerPayments.Commands.ProcessPaymentWebhook;

public sealed record ProcessPaymentWebhookCommand(
    IncomingPaymentTransaction Transaction)
    : IRequest<bool>;

public sealed class ProcessPaymentWebhookCommandHandler
    : IRequestHandler<ProcessPaymentWebhookCommand, bool>
{
    private readonly IApplicationDbContext _context;
    private readonly IAdminNotificationPublisher _notificationPublisher;
    private readonly IPaymentGateway _paymentGateway;
    private readonly CustomerPaymentQuoteService _quoteService;

    public ProcessPaymentWebhookCommandHandler(
        IApplicationDbContext context,
        IAdminNotificationPublisher notificationPublisher,
        IPaymentGateway paymentGateway,
        CustomerPaymentQuoteService quoteService)
    {
        _context = context;
        _notificationPublisher = notificationPublisher;
        _paymentGateway = paymentGateway;
        _quoteService = quoteService;
    }

    public async Task<bool> Handle(
        ProcessPaymentWebhookCommand request,
        CancellationToken cancellationToken)
    {
        var transaction = request.Transaction;
        var attempt = await _context.PaymentAttempts
            .FirstOrDefaultAsync(
                item => item.Provider == _paymentGateway.Provider &&
                        item.ProviderPaymentLinkId == transaction.PaymentCode,
                cancellationToken);

        if (attempt == null)
            return true;

        if (attempt.Status == PaymentAttempt.PaidStatus ||
            attempt.Status == PaymentAttempt.RequiresReviewStatus)
        {
            return true;
        }

        var transactionWasAfterExpiry =
            attempt.ExpiresAt < transaction.OccurredAtUtc;
        if (attempt.Status == PaymentAttempt.PendingStatus &&
            transactionWasAfterExpiry)
        {
            attempt.MarkExpired();
        }

        if (attempt.Status == PaymentAttempt.CancelledStatus ||
            (attempt.Status == PaymentAttempt.ExpiredStatus &&
             transactionWasAfterExpiry) ||
            attempt.Status == PaymentAttempt.FailedStatus ||
            attempt.Status == PaymentAttempt.CreatingStatus)
        {
            var reason = attempt.Status switch
            {
                PaymentAttempt.CancelledStatus => "PaidAfterPaymentCancellation",
                PaymentAttempt.ExpiredStatus => "PaidAfterPaymentExpiry",
                PaymentAttempt.FailedStatus => "PaidAfterPaymentAttemptFailure",
                _ => "PaymentWebhookBeforeAttemptActivated"
            };

            attempt.MarkRequiresReview(
                transaction.Amount,
                transaction.TransactionId,
                reason,
                "PAID");
            await _context.SaveChangesAsync(cancellationToken);
            return true;
        }

        if (attempt.Amount != transaction.Amount)
        {
            attempt.MarkRequiresReview(
                transaction.Amount,
                transaction.TransactionId,
                "AmountMismatch",
                "PAID");
            await _context.SaveChangesAsync(cancellationToken);
            return true;
        }

        var order = await _context.Orders
            .FirstOrDefaultAsync(
                item => item.Id == attempt.OrderId,
                cancellationToken);

        if (order == null)
        {
            attempt.MarkRequiresReview(
                transaction.Amount,
                transaction.TransactionId,
                "OrderMissing",
                "PAID");
            await _context.SaveChangesAsync(cancellationToken);
            return true;
        }

        if (!order.IsActive || order.Status == "Cancelled")
        {
            attempt.MarkRequiresReview(
                transaction.Amount,
                transaction.TransactionId,
                "PaidAfterOrderCancellation",
                "PAID");
            await _context.SaveChangesAsync(cancellationToken);
            return true;
        }

        var existingPayment = await _context.Payments
            .FirstOrDefaultAsync(
                payment => payment.OrderId == order.Id && payment.Status == "Paid",
                cancellationToken);

        if (existingPayment != null)
        {
            attempt.MarkRequiresReview(
                transaction.Amount,
                transaction.TransactionId,
                "DuplicatePaymentAfterOrderAlreadyPaid",
                "PAID");
            await _context.SaveChangesAsync(cancellationToken);
            return true;
        }

        if (!CustomerPaymentAccessService.CanStartOnlinePayment(order))
        {
            attempt.MarkRequiresReview(
                transaction.Amount,
                transaction.TransactionId,
                $"PaidWhenOrderStatusNotPayable:{order.Status}",
                "PAID");
            await _context.SaveChangesAsync(cancellationToken);
            return true;
        }

        CustomerPaymentQuote quote;
        try
        {
            quote = await _quoteService.CalculateAsync(order, cancellationToken);
        }
        catch (InvalidOperationException exception)
        {
            attempt.MarkRequiresReview(
                transaction.Amount,
                transaction.TransactionId,
                $"QuoteUnavailable: {exception.Message}",
                "PAID");
            await _context.SaveChangesAsync(cancellationToken);
            return true;
        }

        if (quote.FinalAmount != attempt.Amount)
        {
            attempt.MarkRequiresReview(
                transaction.Amount,
                transaction.TransactionId,
                "OrderAmountChangedAfterPaymentRequestCreation",
                "PAID");
            await _context.SaveChangesAsync(cancellationToken);
            return true;
        }

        var payment = new Payment(
            order.Id,
            quote.Subtotal,
            quote.DiscountAmount,
            quote.VatAmount,
            quote.FinalAmount,
            "BankTransfer",
            $"{_paymentGateway.Provider} | transactionId={transaction.TransactionId} | " +
            $"reference={transaction.BankReference} | gateway={transaction.Gateway} | " +
            $"attempt={attempt.Id}",
            quote.ServiceChargeAmount);

        await _context.Payments.AddAsync(payment, cancellationToken);
        attempt.MarkPaid(
            payment.Id,
            transaction.Amount,
            transaction.TransactionId,
            "PAID");

        var promotionUsage = await _context.PromotionUsages
            .FirstOrDefaultAsync(
                usage => usage.OrderId == order.Id && usage.Status == "Applied",
                cancellationToken);
        promotionUsage?.SetPayment(payment.Id);

        order.UpdateTotalAmount(quote.Subtotal);

        if (order.OrderType == "Takeaway" &&
            order.Status is "Ready" or "Served")
        {
            var orderItems = await _context.OrderItems
                .Where(item => item.OrderId == order.Id)
                .ToListAsync(cancellationToken);
            var activeItems = orderItems
                .Where(item => item.Status != "Cancelled")
                .ToList();

            if (activeItems.Count > 0 &&
                activeItems.All(item => item.Status is "Ready" or "Served"))
            {
                foreach (var item in activeItems.Where(item => item.Status == "Ready"))
                    item.MarkServed();

                order.MarkCompleted();
            }
        }
        else if (order.Status == "Served")
        {
            order.MarkCompleted();
            if (order.RestaurantTableId.HasValue)
            {
                var table = await _context.RestaurantTables.FirstOrDefaultAsync(
                    item => item.Id == order.RestaurantTableId.Value,
                    cancellationToken);
                table?.MarkAvailable();
            }
        }

        await PaidOrderInvoiceIssuer.IssueAsync(
            _context,
            order,
            payment,
            $"Phát hành tự động từ thanh toán chuyển khoản QR qua {_paymentGateway.Provider}",
            cancellationToken);

        var notifications = new List<Notification>();
        if (order.CustomerUserId.HasValue)
        {
            notifications.Add(new Notification(
                order.CustomerUserId.Value,
                "Payment.Paid",
                "Thanh toán thành công",
                order.Status == "Completed"
                    ? $"Đơn {order.OrderCode} đã thanh toán " +
                      $"{quote.FinalAmount.ToString("N0", CultureInfo.GetCultureInfo("vi-VN"))} đ qua {_paymentGateway.Provider} và đã hoàn tất."
                    : $"Đơn {order.OrderCode} đã thanh toán " +
                      $"{quote.FinalAmount.ToString("N0", CultureInfo.GetCultureInfo("vi-VN"))} đ qua {_paymentGateway.Provider}.",
                "success",
                "/orders",
                order.Id));
        }

        var adminUserIds = await _context.Users
            .AsNoTracking()
            .Where(user =>
                user.IsActive &&
                user.IsEmailVerified &&
                AdminNotificationAudience.OrderAndReservationRoles
                    .Contains(user.Role))
            .Select(user => user.Id)
            .ToListAsync(cancellationToken);

        notifications.AddRange(adminUserIds.Select(userId => new Notification(
            userId,
            "Payment.PaidFromCustomer",
            "Đã nhận chuyển khoản QR",
            order.Status == "Completed"
                ? $"Đơn {order.OrderCode} vừa thanh toán " +
                  $"{quote.FinalAmount.ToString("N0", CultureInfo.GetCultureInfo("vi-VN"))} đ qua {_paymentGateway.Provider} và đã tự động hoàn tất."
                : $"Đơn {order.OrderCode} vừa thanh toán " +
                  $"{quote.FinalAmount.ToString("N0", CultureInfo.GetCultureInfo("vi-VN"))} đ qua {_paymentGateway.Provider}.",
            "success",
            "Hóa đơn",
            order.Id)));

        if (notifications.Count > 0)
        {
            await _context.Notifications.AddRangeAsync(
                notifications,
                cancellationToken);
        }

        await _context.SaveChangesAsync(cancellationToken);
        await _notificationPublisher.PublishAsync(
            notifications.Select(NotificationDto.FromEntity).ToArray(),
            cancellationToken);

        return true;
    }
}
