using MediatR;
using Microsoft.EntityFrameworkCore;
using QuanLyNhaHang.Application.Common.Interfaces;
using QuanLyNhaHang.Application.Features.RestaurantSettings.DTOs;

namespace QuanLyNhaHang.Application.Features.RestaurantSettings.Commands.Update;

public class UpdateRestaurantSettingCommandHandler
    : IRequestHandler<UpdateRestaurantSettingCommand, RestaurantSettingDto>
{
    private readonly IApplicationDbContext _context;

    public UpdateRestaurantSettingCommandHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<RestaurantSettingDto> Handle(
        UpdateRestaurantSettingCommand request,
        CancellationToken cancellationToken)
    {
        var setting = await _context.RestaurantSettings
            .FirstOrDefaultAsync(x => x.Id == request.Id, cancellationToken);

        if (setting == null)
            throw new Exception("Không tìm thấy cài đặt nhà hàng.");

        if (request.IsActive)
        {
            var existedOtherActiveSetting = await _context.RestaurantSettings
                .AnyAsync(x =>
                    x.Id != request.Id &&
                    x.IsActive,
                    cancellationToken);

            if (existedOtherActiveSetting)
                throw new Exception("Đã tồn tại cài đặt nhà hàng khác đang hoạt động.");
        }

        setting.UpdateInfo(
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

        if (request.IsActive)
            setting.Activate();
        else
            setting.Deactivate();

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