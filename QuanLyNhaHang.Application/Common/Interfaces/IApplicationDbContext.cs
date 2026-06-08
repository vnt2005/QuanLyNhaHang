using Microsoft.EntityFrameworkCore;
using QuanLyNhaHang.Domain.Entities;

namespace QuanLyNhaHang.Application.Common.Interfaces;

public interface IApplicationDbContext
{
    DbSet<User> Users { get; }
    DbSet<Employee> Employees { get; }
    DbSet<Shift> Shifts { get; }
    DbSet<EmployeeShift> EmployeeShifts { get; }
    DbSet<Area> Areas { get; }
    DbSet<RestaurantTable> RestaurantTables { get; }
    DbSet<MenuCategory> MenuCategories { get; }
    DbSet<MenuItem> MenuItems { get; }
    DbSet<Order> Orders { get; }
    DbSet<OrderItem> OrderItems { get; }
    DbSet<Payment> Payments { get; }
    DbSet<Invoice> Invoices { get; }
    DbSet<InvoiceItem> InvoiceItems { get; }
    DbSet<RevenueReport> RevenueReports { get; }
    DbSet<RevenueReportItem> RevenueReportItems { get; }
    Task<int> SaveChangesAsync(CancellationToken cancellationToken);
}