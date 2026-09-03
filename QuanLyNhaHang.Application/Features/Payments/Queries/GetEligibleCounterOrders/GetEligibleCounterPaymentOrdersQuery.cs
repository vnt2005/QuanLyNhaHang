using MediatR;
using QuanLyNhaHang.Application.Features.Payments.DTOs;

namespace QuanLyNhaHang.Application.Features.Payments.Queries.GetEligibleCounterOrders;

public sealed record GetEligibleCounterPaymentOrdersQuery
    : IRequest<IReadOnlyList<EligibleCounterPaymentOrderDto>>;
