using MediatR;
using Microsoft.EntityFrameworkCore;
using QuanLyNhaHang.Application.Common.Interfaces;
using QuanLyNhaHang.Application.Common.Payments;
using QuanLyNhaHang.Application.Features.CustomerPayments.DTOs;
using QuanLyNhaHang.Application.Features.CustomerPayments.Services;
using QuanLyNhaHang.Domain.Entities;

namespace QuanLyNhaHang.Application.Features.CustomerPayments.Commands.CancelPaymentAttempt;

public sealed record CancelPaymentAttemptCommand(
    Guid OrderId,
    Guid AttemptId,
    string? QrToken)
    : IRequest<CustomerPaymentResult<CancelPaymentAttemptDto>>;

public sealed class CancelPaymentAttemptCommandHandler
    : IRequestHandler<
        CancelPaymentAttemptCommand,
        CustomerPaymentResult<CancelPaymentAttemptDto>>
{
    private readonly IApplicationDbContext _context;
    private readonly IPaymentGateway _paymentGateway;
    private readonly CustomerPaymentAccessService _accessService;

    public CancelPaymentAttemptCommandHandler(
        IApplicationDbContext context,
        IPaymentGateway paymentGateway,
        CustomerPaymentAccessService accessService)
    {
        _context = context;
        _paymentGateway = paymentGateway;
        _accessService = accessService;
    }

    public async Task<CustomerPaymentResult<CancelPaymentAttemptDto>> Handle(
        CancelPaymentAttemptCommand request,
        CancellationToken cancellationToken)
    {
        var attempt = await _context.PaymentAttempts
            .FirstOrDefaultAsync(
                item => item.Id == request.AttemptId &&
                        item.OrderId == request.OrderId &&
                        item.Provider == _paymentGateway.Provider,
                cancellationToken);

        if (attempt == null)
        {
            return CustomerPaymentResult<CancelPaymentAttemptDto>.NotFound(
                "Không tìm thấy phiên thanh toán.");
        }

        var order = await _accessService.GetAccessibleOrderAsync(
            request.OrderId,
            request.QrToken,
            hasPaymentAttemptAccess: true,
            cancellationToken);
        if (order == null)
        {
            return CustomerPaymentResult<CancelPaymentAttemptDto>.NotFound(
                "Không tìm thấy đơn hàng.");
        }

        if (attempt.Status == PaymentAttempt.PaidStatus)
        {
            return CustomerPaymentResult<CancelPaymentAttemptDto>.Conflict(
                "Giao dịch đã được thanh toán.");
        }

        if (attempt.Status == PaymentAttempt.RequiresReviewStatus)
        {
            return CustomerPaymentResult<CancelPaymentAttemptDto>.Success(
                new CancelPaymentAttemptDto
                {
                    AttemptStatus = attempt.Status,
                    RequiresReview = true
                });
        }

        if (attempt.Status == PaymentAttempt.CancelledStatus ||
            attempt.Status == PaymentAttempt.ExpiredStatus ||
            attempt.Status == PaymentAttempt.FailedStatus)
        {
            return CustomerPaymentResult<CancelPaymentAttemptDto>.Success(
                new CancelPaymentAttemptDto
                {
                    AttemptStatus = attempt.Status
                });
        }

        attempt.MarkCancelled(
            "Khách hàng hủy phiên thanh toán. QR chuyển khoản cũ không còn được tự động ghi nhận vào đơn.");
        await _context.SaveChangesAsync(cancellationToken);

        return CustomerPaymentResult<CancelPaymentAttemptDto>.Success(
            new CancelPaymentAttemptDto
            {
                AttemptStatus = attempt.Status
            });
    }
}
