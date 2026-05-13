using Microsoft.EntityFrameworkCore;
using QuanLyNhaHang.Domain.Entities;

namespace QuanLyNhaHang.Application.Common.Interfaces;

public interface IApplicationDbContext
{
    DbSet<User> Users { get; }

    Task<int> SaveChangesAsync(CancellationToken cancellationToken);
}