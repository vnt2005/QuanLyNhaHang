using MediatR;
using QuanLyNhaHang.Application.Features.CustomerPayments.DTOs;

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
    private readonly CustomerPaymentWorkflow _workflow;

    public CancelPaymentAttemptCommandHandler(CustomerPaymentWorkflow workflow)
    {
        _workflow = workflow;
    }

    public Task<CustomerPaymentResult<CancelPaymentAttemptDto>> Handle(
        CancelPaymentAttemptCommand request,
        CancellationToken cancellationToken)
        => _workflow.CancelAsync(
            request.OrderId,
            request.AttemptId,
            request.QrToken,
            cancellationToken);
}
