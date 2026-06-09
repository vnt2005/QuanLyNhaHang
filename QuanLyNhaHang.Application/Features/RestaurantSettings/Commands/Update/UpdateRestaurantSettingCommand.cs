using MediatR;
using QuanLyNhaHang.Application.Features.RestaurantSettings.DTOs;

namespace QuanLyNhaHang.Application.Features.RestaurantSettings.Commands.Update;

public class UpdateRestaurantSettingCommand : IRequest<RestaurantSettingDto>
{
    public Guid Id { get; set; }

    public string RestaurantName { get; set; } = string.Empty;

    public string Address { get; set; } = string.Empty;

    public string PhoneNumber { get; set; } = string.Empty;

    public string? Email { get; set; }

    public string? TaxCode { get; set; }

    public string? WebsiteUrl { get; set; }

    public string? LogoUrl { get; set; }

    public decimal DefaultVatPercent { get; set; }

    public decimal ServiceChargePercent { get; set; }

    public string Currency { get; set; } = "VND";

    public string OpeningTime { get; set; } = string.Empty;

    public string ClosingTime { get; set; } = string.Empty;

    public string? InvoiceFooter { get; set; }

    public string? QrOrderWelcomeMessage { get; set; }

    public bool IsActive { get; set; } = true;
}