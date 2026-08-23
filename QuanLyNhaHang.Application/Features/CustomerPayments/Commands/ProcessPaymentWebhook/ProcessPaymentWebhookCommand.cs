using MediatR;
using QuanLyNhaHang.Application.Features.CustomerPayments.DTOs;

namespace QuanLyNhaHang.Application.Features.CustomerPayments.Commands.ProcessPaymentWebhook;

public sealed record ProcessPaymentWebhookCommand(
    IncomingPaymentTransaction Transaction)
    : IRequest<bool>;

public sealed class ProcessPaymentWebhookCommandHandler
    : IRequestHandler<ProcessPaymentWebhookCommand, bool>
{
    private readonly CustomerPaymentWorkflow _workflow;

    public ProcessPaymentWebhookCommandHandler(CustomerPaymentWorkflow workflow)
    {
        _workflow = workflow;
    }

    public async Task<bool> Handle(
        ProcessPaymentWebhookCommand request,
        CancellationToken cancellationToken)
    {
        await _workflow.ProcessWebhookAsync(
            request.Transaction,
            cancellationToken);

        return true;
    }
}
