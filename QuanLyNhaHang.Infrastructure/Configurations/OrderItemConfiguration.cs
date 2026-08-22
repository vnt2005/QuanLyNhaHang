using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using QuanLyNhaHang.Domain.Entities;

namespace QuanLyNhaHang.Infrastructure.Configurations;

public class OrderItemConfiguration : IEntityTypeConfiguration<OrderItem>
{
    public void Configure(EntityTypeBuilder<OrderItem> builder)
    {
        builder.ToTable("OrderItems", table =>
        {
            table.HasCheckConstraint(
                "CK_OrderItems_Quantity_Range",
                "[Quantity] >= 1 AND [Quantity] <= 99");
            table.HasCheckConstraint(
                "CK_OrderItems_Amounts_NonNegative",
                "[UnitPrice] >= 0 AND [TotalPrice] >= 0");
            table.HasCheckConstraint(
                "CK_OrderItems_TotalPrice",
                "[TotalPrice] = [UnitPrice] * [Quantity]");
        });

        builder.HasKey(x => x.Id);

        builder.Property(x => x.OrderId)
            .IsRequired();

        builder.Property(x => x.MenuItemId)
            .IsRequired();

        builder.Property(x => x.MenuItemName)
            .IsRequired()
            .HasMaxLength(150);

        builder.Property(x => x.Quantity)
            .IsRequired();

        builder.Property(x => x.UnitPrice)
            .IsRequired()
            .HasColumnType("decimal(18,2)");

        builder.Property(x => x.TotalPrice)
            .IsRequired()
            .HasColumnType("decimal(18,2)");

        builder.Property(x => x.Status)
            .IsRequired()
            .HasMaxLength(50);

        builder.Property(x => x.Note)
            .HasMaxLength(500);

        builder.Property(x => x.CreatedAt)
            .IsRequired();

        builder.Property(x => x.UpdatedAt)
            .IsRequired(false);

        builder.Property(x => x.StartedAt)
            .IsRequired(false);

        builder.Property(x => x.CompletedAt)
            .IsRequired(false);

        builder.Property(x => x.RowVersion)
            .IsRowVersion();

        builder.HasIndex(x => x.OrderId);
        builder.HasIndex(x => x.MenuItemId);

        builder.HasOne<Order>()
            .WithMany()
            .HasForeignKey(x => x.OrderId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne<MenuItem>()
            .WithMany()
            .HasForeignKey(x => x.MenuItemId)
            .OnDelete(DeleteBehavior.Restrict);
    }
}
