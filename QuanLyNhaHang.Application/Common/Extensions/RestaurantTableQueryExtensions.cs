using QuanLyNhaHang.Application.Common.Interfaces;
using QuanLyNhaHang.Domain.Entities;

namespace QuanLyNhaHang.Application.Common.Extensions;

public static class RestaurantTableQueryExtensions
{
    public static IQueryable<RestaurantTable> WhereOperational(
        this IQueryable<RestaurantTable> tables,
        IApplicationDbContext context)
    {
        return tables.Where(table =>
            table.IsActive &&
            context.Areas.Any(area =>
                area.Id == table.AreaId &&
                area.IsActive));
    }

    public static IQueryable<RestaurantTable> WhereSelectableForOrder(
        this IQueryable<RestaurantTable> tables,
        IApplicationDbContext context)
    {
        return tables
            .WhereOperational(context)
            .Where(table =>
                table.Status != "Cleaning" &&
                !context.Orders.Any(order =>
                    order.RestaurantTableId == table.Id &&
                    order.IsActive &&
                    order.Status != "Completed" &&
                    order.Status != "Cancelled"));
    }

    public static IQueryable<RestaurantTable> WhereSelectableForQrCode(
        this IQueryable<RestaurantTable> tables,
        IApplicationDbContext context)
    {
        return tables
            .WhereOperational(context)
            .Where(table =>
                !context.TableQrCodes.Any(qrCode =>
                    qrCode.RestaurantTableId == table.Id));
    }

    public static IQueryable<RestaurantTable> WhereAvailableForTableOperation(
        this IQueryable<RestaurantTable> tables,
        IApplicationDbContext context)
    {
        return tables
            .WhereOperational(context)
            .Where(table =>
                table.Status == "Available" &&
                !context.Orders.Any(order =>
                    order.RestaurantTableId == table.Id &&
                    order.IsActive &&
                    order.Status != "Completed" &&
                    order.Status != "Cancelled"));
    }
}
