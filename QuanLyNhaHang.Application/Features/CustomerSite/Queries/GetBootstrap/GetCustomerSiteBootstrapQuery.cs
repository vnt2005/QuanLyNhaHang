using MediatR;
using QuanLyNhaHang.Application.Features.CustomerSite.DTOs;

namespace QuanLyNhaHang.Application.Features.CustomerSite.Queries.GetBootstrap;

public sealed record GetCustomerSiteBootstrapQuery
    : IRequest<CustomerSiteBootstrapDto>;
