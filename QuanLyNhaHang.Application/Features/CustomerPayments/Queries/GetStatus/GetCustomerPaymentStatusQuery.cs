using MediatR;
using Microsoft.EntityFrameworkCore;
using QuanLyNhaHang.Application.Common.Interfaces;
using QuanLyNhaHang.Application.Common.Payments;
using QuanLyNhaHang.Application.Features.CustomerPayments.DTOs;
using QuanLyNhaHang.Application.Features.CustomerPayments.Services;
using QuanLyNhaHang.Domain.Entities;

namespace QuanLyNhaHang.Application.Features.CustomerPayments.Queries.GetStatus;

public sealed record GetCustomerPaymentStatusQuery(
    Guid OrderId,
    string? QrToken,
    Guid? AttemptId)
    : IRequest<CustomerPaymentResult<CustomerPaymentStatusDto>>;

public sealed class GetCustomerPaymentStatusQueryHandler
    : IRequestHandler<
        GetCustomerPaymentStatusQuery,
        CustomerPaymentResult<CustomerPaymentStatusDto>>
{
    private readonly IApplicationDbContext _context;
    private readonly IPaymentGateway _paymentGateway;
    private readonly IPaymentChannelReadiness _paymentChannelReadiness;
    private readonly CustomerPaymentAccessService _accessService;
    private readonly CustomerPaymentAttemptService _attemptService;

    public GetCustomerPaymentStatusQueryHandler(
        IApplicationDbContext context,
        IPaymentGateway paymentGateway,
        IPaymentChannelReadiness paymentChannelReadiness,
        CustomerPaymentAccessService accessService,
        CustomerPaymentAttemptService attemptService)
    {
        _context = context;
        _paymentGateway = paymentGateway;
        _paymentChannelReadiness = paymentChannelReadiness;
        _accessService = accessService;
        _attemptService = attemptService;
    }

    public async Task<CustomerPaymentResult<CustomerPaymentStatusDto>> Handle(
        GetCustomerPaymentStatusQuery request,
        CancellationToken cancellationToken)
    {
        var requestedAttempt = request.AttemptId.HasValue
            ? await _context.PaymentAttempts
                .FirstOrDefaultAsync(
                    item => item.Id == request.AttemptId.Value &&
                            item.OrderId == request.OrderId &&
                            item.Provider == _paymentGateway.Provider,
                    cancellationToken)
            : null;

        var order = await _accessService.GetAccessibleOrderAsync(
            request.OrderId,
            request.QrToken,
            hasPaymentAttemptAccess: requestedAttempt != null,
            cancellationToken);
        if (order == null)
        {
            return CustomerPaymentResult<CustomerPaymentStatusDto>.NotFound(
                "Không tìm thấy đơn hàng.");
        }

        var payment = await _context.Payments
            .AsNoTracking()
            .Where(item => item.OrderId == order.Id && item.Status == "Paid")
            .OrderByDescending(item => item.PaidAt)
            .FirstOrDefaultAsync(cancellationToken);

        var latestAttempt = requestedAttempt ?? await _context.PaymentAttempts
            .Where(item => item.OrderId == order.Id &&
                           item.Provider == _paymentGateway.Provider)
            .OrderByDescending(item => item.CreatedAt)
            .FirstOrDefaultAsync(cancellationToken);

        var attemptChanged = false;
        if (latestAttempt != null &&
            (latestAttempt.Status == PaymentAttempt.CreatingStatus ||
             latestAttempt.Status == PaymentAttempt.PendingStatus) &&
            latestAttempt.ExpiresAt <= DateTime.UtcNow)
        {
            latestAttempt.MarkExpired();
            attemptChanged = true;
        }

        if (payment == null &&
            latestAttempt != null &&
            !CustomerPaymentAccessService.CanStartOnlinePayment(order.Status) &&
            (latestAttempt.Status == PaymentAttempt.CreatingStatus ||
             latestAttempt.Status == PaymentAttempt.PendingStatus))
        {
            latestAttempt.MarkCancelled(
                $"Order status {order.Status} is not eligible for online payment.");
            attemptChanged = true;
        }

        if (attemptChanged)
            await _context.SaveChangesAsync(cancellationToken);

        var paymentChannel = _paymentChannelReadiness.GetSnapshot();
        var orderCanStartOnlinePayment =
            CustomerPaymentAccessService.CanStartOnlinePayment(order.Status);
        var canPay = payment == null &&
                     orderCanStartOnlinePayment &&
                     paymentChannel.Ready;
        var paymentUnavailableReason = payment != null
            ? null
            : !orderCanStartOnlinePayment
                ? CustomerPaymentAccessService.GetPaymentUnavailableMessage(order.Status)
                : !paymentChannel.Ready
                    ? CustomerPaymentAccessService.GetWebhookUnavailableMessage()
                    : null;
        var instruction = _attemptService.BuildInstruction(
            latestAttempt,
            paymentChannel.Ready);

        return CustomerPaymentResult<CustomerPaymentStatusDto>.Success(
            new CustomerPaymentStatusDto
            {
                OrderId = order.Id,
                OrderCode = order.OrderCode,
                OrderStatus = order.Status,
                Paid = payment != null,
                CanPay = canPay,
                PaymentUnavailableReason = paymentUnavailableReason,
                PaymentCode = payment?.PaymentCode,
                Amount = payment?.FinalAmount ?? latestAttempt?.Amount,
                PaidAt = payment?.PaidAt,
                PaymentMethod = payment?.PaymentMethod,
                PaymentChannelReady = paymentChannel.Ready,
                PaymentChannelRequired = paymentChannel.Required,
                PaymentChannelLastConfirmedAt = paymentChannel.LastConfirmedAtUtc,
                AttemptId = latestAttempt?.Id,
                AttemptStatus = latestAttempt?.Status,
                RequiresReview = latestAttempt?.Status == PaymentAttempt.RequiresReviewStatus,
                ReviewReason = latestAttempt?.ReviewReason,
                ExpectedAmount = latestAttempt?.Amount,
                ReceivedAmount = latestAttempt?.ReceivedAmount,
                ExpiresAt = latestAttempt?.ExpiresAt,
                QrCode = instruction?.QrCodeUrl,
                TransferContent = instruction?.PaymentCode,
                BankCode = instruction?.BankCode,
                AccountNumber = instruction?.AccountNumber,
                AccountHolder = instruction?.AccountHolder
            });
    }
}
