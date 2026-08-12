using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using QuanLyNhaHang.Domain.Entities;

namespace QuanLyNhaHang.Infrastructure.Configurations;

public class OrderConfiguration : IEntityTypeConfiguration<Order>
{
    public void Configure(EntityTypeBuilder<Order> builder)
    {
        builder.ToTable("Orders");

        builder.HasKey(x => x.Id);

        builder.Property(x => x.RestaurantTableId)
            .IsRequired();

        builder.Property(x => x.CustomerUserId)
            .IsRequired(false);

        builder.HasIndex(x => new
            {
                x.CustomerUserId,
                x.CreatedAt
            })
            .HasDatabaseName("IX_Orders_CustomerUserId_CreatedAt")
            .HasFilter("[CustomerUserId] IS NOT NULL");

        builder.HasOne<User>()
            .WithMany()
            .HasForeignKey(x => x.CustomerUserId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.Property(x => x.OrderCode)
            .IsRequired()
            .HasMaxLength(50);

        builder.HasIndex(x => x.OrderCode)
            .IsUnique();

        builder.Property(x => x.Status)
            .IsRequired()
            .HasMaxLength(50);

        builder.Property(x => x.TotalAmount)
            .IsRequired()
            .HasColumnType("decimal(18,2)");

        builder.Property(x => x.Note)
            .HasMaxLength(500);

        builder.Property(x => x.IsActive)
            .IsRequired();

        builder.Property(x => x.CreatedAt)
            .IsRequired();

        builder.Property(x => x.UpdatedAt)
            .IsRequired(false);
    }
}
