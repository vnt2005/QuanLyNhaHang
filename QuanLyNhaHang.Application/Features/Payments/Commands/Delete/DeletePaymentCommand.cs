using MediatR;

namespace QuanLyNhaHang.Application.Features.Payments.Commands.Delete;

public class DeletePaymentCommand : IRequest<bool>
{
    public Guid Id { get; set; }
}