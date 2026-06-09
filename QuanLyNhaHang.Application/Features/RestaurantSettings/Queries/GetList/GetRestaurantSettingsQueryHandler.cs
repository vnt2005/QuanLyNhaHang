using MediatR;
using Microsoft.EntityFrameworkCore;
using QuanLyNhaHang.Application.Common.Interfaces;
using QuanLyNhaHang.Application.Features.RestaurantSettings.DTOs;

namespace QuanLyNhaHang.Application.Features.RestaurantSettings.Queries.GetList;

public class GetRestaurantSettingsQueryHandler
    : IRequestHandler<GetRestaurantSettingsQuery, List<RestaurantSettingDto>>
{
    private readonly IApplicationDbContext _context;

    public GetRestaurantSettingsQueryHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<List<RestaurantSettingDto>> Handle(
        GetRestaurantSettingsQuery request,
        CancellationToken cancellationToken)
    {
        var query = _context.RestaurantSettings
            .AsNoTracking()
            .AsQueryable();

        if (request.IsActive.HasValue)
        {
            query = query.Where(x => x.IsActive == request.IsActive.Value);
        }

        var result = await query
            .OrderByDescending(x => x.CreatedAt)
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
            .ToListAsync(cancellationToken);

        return result;
    }
}