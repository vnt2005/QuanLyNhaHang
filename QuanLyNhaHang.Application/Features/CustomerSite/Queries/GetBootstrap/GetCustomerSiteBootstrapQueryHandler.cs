using MediatR;
using Microsoft.EntityFrameworkCore;
using QuanLyNhaHang.Application.Common.Extensions;
using QuanLyNhaHang.Application.Common.Interfaces;
using QuanLyNhaHang.Application.Features.CustomerSite.DTOs;

namespace QuanLyNhaHang.Application.Features.CustomerSite.Queries.GetBootstrap;

public sealed class GetCustomerSiteBootstrapQueryHandler
    : IRequestHandler<GetCustomerSiteBootstrapQuery, CustomerSiteBootstrapDto>
{
    private readonly IApplicationDbContext _context;

    public GetCustomerSiteBootstrapQueryHandler(IApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<CustomerSiteBootstrapDto> Handle(
        GetCustomerSiteBootstrapQuery request,
        CancellationToken cancellationToken)
    {
        var restaurant = await _context.RestaurantSettings
            .AsNoTracking()
            .Where(setting => setting.IsActive)
            .OrderByDescending(setting => setting.UpdatedAt ?? setting.CreatedAt)
            .Select(setting => new CustomerSiteRestaurantDto
            {
                RestaurantName = setting.RestaurantName,
                Address = setting.Address,
                PhoneNumber = setting.PhoneNumber,
                Email = setting.Email,
                LogoUrl = setting.LogoUrl,
                Currency = setting.Currency,
                OpeningTime = setting.OpeningTime,
                ClosingTime = setting.ClosingTime,
                WelcomeMessage = setting.QrOrderWelcomeMessage
            })
            .FirstOrDefaultAsync(cancellationToken);

        var categories = await _context.MenuCategories
            .AsNoTracking()
            .Where(category => category.IsActive)
            .OrderBy(category => category.DisplayOrder)
            .ThenBy(category => category.Name)
            .Select(category => new CustomerSiteMenuCategoryDto
            {
                Id = category.Id,
                Name = category.Name,
                Description = category.Description,
                DisplayOrder = category.DisplayOrder
            })
            .ToListAsync(cancellationToken);

        var menuItems = await (
            from menuItem in _context.MenuItems.AsNoTracking()
            join category in _context.MenuCategories.AsNoTracking()
                on menuItem.MenuCategoryId equals category.Id
            where menuItem.IsActive &&
                  menuItem.IsAvailable &&
                  category.IsActive
            orderby category.DisplayOrder, category.Name, menuItem.Name
            select new CustomerSiteMenuItemDto
            {
                Id = menuItem.Id,
                MenuCategoryId = category.Id,
                MenuCategoryName = category.Name,
                Name = menuItem.Name,
                Description = menuItem.Description,
                Price = menuItem.Price,
                ImageUrl = menuItem.ImageUrl,
                IsAvailable = menuItem.IsAvailable
            })
            .ToListAsync(cancellationToken);

        var reservationTables = await (
            from table in _context.RestaurantTables
                .AsNoTracking()
                .WhereOperational(_context)
            join area in _context.Areas.AsNoTracking()
                on table.AreaId equals area.Id
            orderby area.Name, table.Capacity, table.Name
            select new CustomerSiteReservationTableDto
            {
                Id = table.Id,
                AreaName = area.Name,
                Name = table.Name,
                Capacity = table.Capacity
            })
            .ToListAsync(cancellationToken);

        return new CustomerSiteBootstrapDto
        {
            Restaurant = restaurant,
            MenuCategories = categories,
            MenuItems = menuItems,
            ReservationTables = reservationTables
        };
    }
}
