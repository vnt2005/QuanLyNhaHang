using MediatR;
using Microsoft.EntityFrameworkCore;
using QuanLyNhaHang.Application.Common.Interfaces;
using QuanLyNhaHang.Application.Common.Payments;
using QuanLyNhaHang.Application.Features.CustomerPayments.DTOs;
using QuanLyNhaHang.Application.Features.CustomerPayments.Services;
using QuanLyNhaHang.Domain.Entities;

namespace QuanLyNhaHang.Application.Features.CustomerPayments.Commands.CreateOnlinePayment;

public sealed record CreateOnlinePaymentCommand(
    Guid OrderId,
    string? QrToken)
    : IRequest<CustomerPaymentResult<CustomerPaymentInstructionDto>>;

public sealed class CreateOnlinePaymentCommandHandler
    : IRequestHandler<
        CreateOnlinePaymentCommand,
        CustomerPaymentResult<CustomerPaymentInstructionDto>>
{
    private static readonly TimeSpan PaymentRequestLifetime = TimeSpan.FromMinutes(15);

    private readonly IApplicationDbContext _context;
    private readonly IPaymentGateway _paymentGateway;
    private readonly IPaymentChannelReadiness _paymentChannelReadiness;
    private readonly CustomerPaymentAccessService _accessService;
    private readonly CustomerPaymentQuoteService _quoteService;
    private readonly CustomerPaymentAttemptService _attemptService;

    public CreateOnlinePaymentCommandHandler(
        IApplicationDbContext context,
        IPaymentGateway paymentGateway,
        IPaymentChannelReadiness paymentChannelReadiness,
        CustomerPaymentAccessService accessService,
        CustomerPaymentQuoteService quoteService,
        CustomerPaymentAttemptService attemptService)
    {
        _context = context;
        _paymentGateway = paymentGateway;
        _paymentChannelReadiness = paymentChannelReadiness;
        _accessService = accessService;
        _quoteService = quoteService;
        _attemptService = attemptService;
    }

    public async Task<CustomerPaymentResult<CustomerPaymentInstructionDto>> Handle(
        CreateOnlinePaymentCommand request,
        CancellationToken cancellationToken)
    {
        if (!_paymentGateway.IsConfigured)
        {
            return CustomerPaymentResult<CustomerPaymentInstructionDto>.Unavailable(
                "Thanh toán SePay chưa được cấu hình đầy đủ trên máy chủ.");
        }

        var order = await _accessService.GetAccessibleOrderAsync(
            request.OrderId,
            request.QrToken,
            hasPaymentAttemptAccess: false,
            cancellationToken);

        if (order == null)
        {
            return CustomerPaymentResult<CustomerPaymentInstructionDto>.NotFound(
                "Không tìm thấy đơn hàng hợp lệ để thanh toán.");
        }

        var existingPayment = await _context.Payments
            .AsNoTracking()
            .FirstOrDefaultAsync(
                payment => payment.OrderId == order.Id && payment.Status == "Paid",
                cancellationToken);

        if (existingPayment != null)
        {
            return CustomerPaymentResult<CustomerPaymentInstructionDto>.Success(
                new CustomerPaymentInstructionDto
                {
                    AlreadyPaid = true,
                    PaymentCode = existingPayment.PaymentCode,
                    Amount = existingPayment.FinalAmount
                });
        }

        if (!CustomerPaymentAccessService.CanStartOnlinePayment(order))
        {
            return CustomerPaymentResult<CustomerPaymentInstructionDto>.Conflict(
                CustomerPaymentAccessService.GetPaymentUnavailableMessage(order),
                order.Status);
        }

        var paymentChannel = _paymentChannelReadiness.GetSnapshot();
        if (!paymentChannel.Ready)
        {
            return CustomerPaymentResult<CustomerPaymentInstructionDto>.Unavailable(
                CustomerPaymentAccessService.GetWebhookUnavailableMessage(),
                "SEPAY_WEBHOOK_UNAVAILABLE",
                paymentChannel.LastConfirmedAtUtc);
        }

        CustomerPaymentQuote quote;
        try
        {
            quote = await _quoteService.CalculateAsync(order, cancellationToken);
        }
        catch (InvalidOperationException exception)
        {
            return CustomerPaymentResult<CustomerPaymentInstructionDto>.Invalid(
                exception.Message);
        }

        var reconciliation = await _attemptService.ReconcileOpenAttemptsAsync(
            order,
            quote,
            cancellationToken);
        if (reconciliation != null)
            return reconciliation;

        var providerOrderCode = await _attemptService.CreateProviderOrderCodeAsync(
            cancellationToken);
        var expiresAt = DateTime.UtcNow.Add(PaymentRequestLifetime);
        var instruction = _paymentGateway.CreatePaymentInstruction(
            providerOrderCode,
            quote.FinalAmount);
        var attempt = new PaymentAttempt(
            order.Id,
            _paymentGateway.Provider,
            providerOrderCode,
            quote.FinalAmount,
            expiresAt);

        attempt.AttachPaymentRequest(
            instruction.PaymentCode,
            instruction.QrCodeUrl,
            "PENDING");

        await _context.PaymentAttempts.AddAsync(attempt, cancellationToken);
        await _context.SaveChangesAsync(cancellationToken);

        return CustomerPaymentResult<CustomerPaymentInstructionDto>.Success(
            _attemptService.BuildInstructionDto(
                order,
                attempt,
                instruction,
                quote,
                reused: false));
    }
}
