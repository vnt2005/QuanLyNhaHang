using MediatR;
using QuanLyNhaHang.Application.Features.Payments.DTOs;

namespace QuanLyNhaHang.Application.Features.Payments.Queries.GetById;

public class GetPaymentByIdQuery : IRequest<PaymentDto?>
{
    public Guid Id { get; set; }
}