using MediatR;
using QuanLyNhaHang.Application.Features.CustomerPayments.DTOs;

namespace QuanLyNhaHang.Application.Features.CustomerPayments.Queries.GetStatus;

public sealed record GetCustomerPaymentStatusQuery(
    Guid OrderId,
    string? QrToken,
    Guid? AttemptId,
    PaymentChannelState PaymentChannel)
    : IRequest<CustomerPaymentResult<CustomerPaymentStatusDto>>;

public sealed class GetCustomerPaymentStatusQueryHandler
    : IRequestHandler<
        GetCustomerPaymentStatusQuery,
        CustomerPaymentResult<CustomerPaymentStatusDto>>
{
    private readonly CustomerPaymentWorkflow _workflow;

    public GetCustomerPaymentStatusQueryHandler(CustomerPaymentWorkflow workflow)
    {
        _workflow = workflow;
    }

    public Task<CustomerPaymentResult<CustomerPaymentStatusDto>> Handle(
        GetCustomerPaymentStatusQuery request,
        CancellationToken cancellationToken)
        => _workflow.GetStatusAsync(
            request.OrderId,
            request.QrToken,
            request.AttemptId,
            request.PaymentChannel,
            cancellationToken);
}
