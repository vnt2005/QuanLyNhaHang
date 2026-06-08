using MediatR;
using QuanLyNhaHang.Application.Features.Payments.DTOs;

namespace QuanLyNhaHang.Application.Features.Payments.Queries.GetList;

public class GetPaymentsQuery : IRequest<List<PaymentDto>>
{
    public string? Status { get; set; }

    public string? PaymentMethod { get; set; }
}