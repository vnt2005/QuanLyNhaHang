using MediatR;
using Microsoft.EntityFrameworkCore;
using QuanLyNhaHang.Application.Common.Interfaces;
using QuanLyNhaHang.Application.Common.Models;
using QuanLyNhaHang.Application.Features.RestaurantSettings.DTOs;

namespace QuanLyNhaHang.Application.Features.RestaurantSettings.Queries.GetWithPaginatedList;

public class GetRestaurantSettingsWithPaginatedListQueryHandler
    : IRequestHandler<GetRestaurantSettingsWithPaginatedListQuery, PaginatedList<RestaurantSettingDto>>
{
    private readonly IApplicationDbContext _context;

    public GetRestaurantSettingsWithPaginatedListQueryHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<PaginatedList<RestaurantSettingDto>> Handle(
        GetRestaurantSettingsWithPaginatedListQuery request,
        CancellationToken cancellationToken)
    {
        var query = _context.RestaurantSettings
            .AsNoTracking()
            .AsQueryable();

        if (!string.IsNullOrWhiteSpace(request.Keyword))
        {
            var keyword = request.Keyword.Trim();

            query = query.Where(x =>
                x.RestaurantName.Contains(keyword) ||
                x.Address.Contains(keyword) ||
                x.PhoneNumber.Contains(keyword) ||
                (x.Email != null && x.Email.Contains(keyword)) ||
                (x.TaxCode != null && x.TaxCode.Contains(keyword)));
        }

        if (request.IsActive.HasValue)
        {
            query = query.Where(x => x.IsActive == request.IsActive.Value);
        }

        var restaurantSettingDtos = query
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
            });

        return await PaginatedList<RestaurantSettingDto>.CreateAsync(
            restaurantSettingDtos,
            request.PageNumber,
            request.PageSize);
    }
}