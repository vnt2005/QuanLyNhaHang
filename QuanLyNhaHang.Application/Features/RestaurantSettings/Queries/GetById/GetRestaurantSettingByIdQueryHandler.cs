using MediatR;
using Microsoft.EntityFrameworkCore;
using QuanLyNhaHang.Application.Common.Interfaces;
using QuanLyNhaHang.Application.Features.RestaurantSettings.DTOs;

namespace QuanLyNhaHang.Application.Features.RestaurantSettings.Queries.GetById;

public class GetRestaurantSettingByIdQueryHandler
    : IRequestHandler<GetRestaurantSettingByIdQuery, RestaurantSettingDto?>
{
    private readonly IApplicationDbContext _context;

    public GetRestaurantSettingByIdQueryHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<RestaurantSettingDto?> Handle(
        GetRestaurantSettingByIdQuery request,
        CancellationToken cancellationToken)
    {
        var result = await _context.RestaurantSettings
            .AsNoTracking()
            .Where(x => x.Id == request.Id)
            .Select(x => new RestaurantSettingDto
            {
                Id = x.Id,
                RestaurantName = x.RestaurantName,
                Address = x.Address,
                PhoneNumber = x.PhoneNumber,
                Email = x.Email,
                TaxCode = x.TaxCode,
                WebsiteUrl = x.WebsiteUrl,
                LogoUrl = x.LogoUrl,
                DefaultVatPercent = x.DefaultVatPercent,
                ServiceChargePercent = x.ServiceChargePercent,
                Currency = x.Currency,
                OpeningTime = x.OpeningTime,
                ClosingTime = x.ClosingTime,
                InvoiceFooter = x.InvoiceFooter,
                QrOrderWelcomeMessage = x.QrOrderWelcomeMessage,
                IsActive = x.IsActive,
                CreatedAt = x.CreatedAt,
                UpdatedAt = x.UpdatedAt
            })
            .FirstOrDefaultAsync(cancellationToken);

        return result;
    }
}