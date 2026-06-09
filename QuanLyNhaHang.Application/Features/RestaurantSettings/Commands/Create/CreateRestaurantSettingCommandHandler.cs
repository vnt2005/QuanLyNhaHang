using MediatR;
using Microsoft.EntityFrameworkCore;
using QuanLyNhaHang.Application.Common.Interfaces;
using QuanLyNhaHang.Application.Features.RestaurantSettings.DTOs;
using QuanLyNhaHang.Domain.Entities;

namespace QuanLyNhaHang.Application.Features.RestaurantSettings.Commands.Create;

public class CreateRestaurantSettingCommandHandler
    : IRequestHandler<CreateRestaurantSettingCommand, RestaurantSettingDto>
{
    private readonly IApplicationDbContext _context;

    public CreateRestaurantSettingCommandHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<RestaurantSettingDto> Handle(
        CreateRestaurantSettingCommand request,
        CancellationToken cancellationToken)
    {
        var existedActiveSetting = await _context.RestaurantSettings
            .AnyAsync(x => x.IsActive, cancellationToken);

        if (existedActiveSetting)
            throw new Exception("Đã tồn tại cài đặt nhà hàng đang hoạt động.");

        var setting = new RestaurantSetting(
            request.RestaurantName,
            request.Address,
            request.PhoneNumber,
            request.Email,
            request.TaxCode,
            request.WebsiteUrl,
            request.LogoUrl,
            request.DefaultVatPercent,
            request.ServiceChargePercent,
            request.Currency,
            request.OpeningTime,
            request.ClosingTime,
            request.InvoiceFooter,
            request.QrOrderWelcomeMessage);

        await _context.RestaurantSettings.AddAsync(setting, cancellationToken);

        await _context.SaveChangesAsync(cancellationToken);

        return new RestaurantSettingDto
        {
            Id = setting.Id,
            RestaurantName = setting.RestaurantName,
            Address = setting.Address,
            PhoneNumber = setting.PhoneNumber,
            Email = setting.Email,
            TaxCode = setting.TaxCode,
            WebsiteUrl = setting.WebsiteUrl,
            LogoUrl = setting.LogoUrl,
            DefaultVatPercent = setting.DefaultVatPercent,
            ServiceChargePercent = setting.ServiceChargePercent,
            Currency = setting.Currency,
            OpeningTime = setting.OpeningTime,
            ClosingTime = setting.ClosingTime,
            InvoiceFooter = setting.InvoiceFooter,
            QrOrderWelcomeMessage = setting.QrOrderWelcomeMessage,
            IsActive = setting.IsActive,
            CreatedAt = setting.CreatedAt,
            UpdatedAt = setting.UpdatedAt
        };
    }
}