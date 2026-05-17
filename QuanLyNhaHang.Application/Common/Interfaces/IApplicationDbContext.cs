using Microsoft.EntityFrameworkCore;
using QuanLyNhaHang.Domain.Entities;

namespace QuanLyNhaHang.Application.Common.Interfaces;

public interface IApplicationDbContext
{
    DbSet<User> Users { get; }
    DbSet<Employee> Employees { get; }
    DbSet<Shift> Shifts { get; }
    DbSet<EmployeeShift> EmployeeShifts { get; }
    Task<int> SaveChangesAsync(CancellationToken cancellationToken);
}