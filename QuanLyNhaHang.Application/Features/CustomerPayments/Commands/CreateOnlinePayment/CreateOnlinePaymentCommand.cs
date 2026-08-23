using MediatR;
using QuanLyNhaHang.Application.Features.CustomerPayments.DTOs;

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
    private readonly CustomerPaymentWorkflow _workflow;

    public CreateOnlinePaymentCommandHandler(CustomerPaymentWorkflow workflow)
    {
        _workflow = workflow;
    }

    public Task<CustomerPaymentResult<CustomerPaymentInstructionDto>> Handle(
        CreateOnlinePaymentCommand request,
        CancellationToken cancellationToken)
        => _workflow.CreateAsync(
            request.OrderId,
            request.QrToken,
            cancellationToken);
}
