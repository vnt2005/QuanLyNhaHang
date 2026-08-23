using MediatR;
using QuanLyNhaHang.Application.Features.CustomerPayments.DTOs;

namespace QuanLyNhaHang.Application.Features.CustomerPayments.Commands.ProcessPaymentWebhook;

public sealed record ProcessPaymentWebhookCommand(
    IncomingPaymentTransaction Transaction)
    : IRequest;

public sealed class ProcessPaymentWebhookCommandHandler
    : IRequestHandler<ProcessPaymentWebhookCommand>
{
    private readonly CustomerPaymentWorkflow _workflow;

    public ProcessPaymentWebhookCommandHandler(CustomerPaymentWorkflow workflow)
    {
        _workflow = workflow;
    }

    public async Task Handle(
        ProcessPaymentWebhookCommand request,
        CancellationToken cancellationToken)
    {
        await _workflow.ProcessWebhookAsync(
            request.Transaction,
            cancellationToken);
    }
}
