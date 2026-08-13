namespace QuanLyNhaHang.Application.Features.CustomerSite.DTOs;

public sealed class CustomerSiteBootstrapDto
{
    public CustomerSiteRestaurantDto? Restaurant { get; set; }

    public List<CustomerSiteMenuCategoryDto> MenuCategories { get; set; } = [];

    public List<CustomerSiteMenuItemDto> MenuItems { get; set; } = [];

    public List<CustomerSiteReservationTableDto> ReservationTables { get; set; } = [];
}

public sealed class CustomerSiteRestaurantDto
{
    public string RestaurantName { get; set; } = string.Empty;

    public string Address { get; set; } = string.Empty;

    public string PhoneNumber { get; set; } = string.Empty;

    public string? Email { get; set; }

    public string? LogoUrl { get; set; }

    public string Currency { get; set; } = "VND";

    public string OpeningTime { get; set; } = string.Empty;

    public string ClosingTime { get; set; } = string.Empty;

    public string? WelcomeMessage { get; set; }
}

public sealed class CustomerSiteMenuCategoryDto
{
    public Guid Id { get; set; }

    public string Name { get; set; } = string.Empty;

    public string? Description { get; set; }

    public int DisplayOrder { get; set; }
}

public sealed class CustomerSiteMenuItemDto
{
    public Guid Id { get; set; }

    public Guid MenuCategoryId { get; set; }

    public string MenuCategoryName { get; set; } = string.Empty;

    public string Name { get; set; } = string.Empty;

    public string? Description { get; set; }

    public decimal Price { get; set; }

    public string? ImageUrl { get; set; }

    public bool IsAvailable { get; set; }
}

public sealed class CustomerSiteReservationTableDto
{
    public Guid Id { get; set; }

    public string AreaName { get; set; } = string.Empty;

    public string Name { get; set; } = string.Empty;

    public int Capacity { get; set; }
}
