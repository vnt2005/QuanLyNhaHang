using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using QuanLyNhaHang.Domain.Entities;

namespace QuanLyNhaHang.Infrastructure.Configurations;

public class InvoiceItemConfiguration : IEntityTypeConfiguration<InvoiceItem>
{
    public void Configure(EntityTypeBuilder<InvoiceItem> builder)
    {
        builder.ToTable("InvoiceItems", table =>
        {
            table.HasCheckConstraint(
                "CK_InvoiceItems_Quantity_Positive",
                "[Quantity] > 0");
            table.HasCheckConstraint(
                "CK_InvoiceItems_Amounts_NonNegative",
                "[UnitPrice] >= 0 AND [TotalPrice] >= 0");
            table.HasCheckConstraint(
                "CK_InvoiceItems_TotalPrice",
                "[TotalPrice] = [UnitPrice] * [Quantity]");
        });

        builder.HasKey(x => x.Id);

        builder.Property(x => x.InvoiceId).IsRequired();

        builder.Property(x => x.OrderItemId).IsRequired();

        builder.Property(x => x.MenuItemId).IsRequired();

        builder.Property(x => x.MenuItemName)
            .IsRequired()
            .HasMaxLength(150);

        builder.Property(x => x.Quantity).IsRequired();

        builder.Property(x => x.UnitPrice)
            .IsRequired()
            .HasColumnType("decimal(18,2)");

        builder.Property(x => x.TotalPrice)
            .IsRequired()
            .HasColumnType("decimal(18,2)");

        builder.Property(x => x.Note)
            .HasMaxLength(500);

        builder.Property(x => x.CreatedAt).IsRequired();

        builder.HasIndex(x => x.InvoiceId);
        builder.HasIndex(x => x.OrderItemId);
        builder.HasIndex(x => x.MenuItemId);

        builder.HasOne<Invoice>()
            .WithMany()
            .HasForeignKey(x => x.InvoiceId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne<OrderItem>()
            .WithMany()
            .HasForeignKey(x => x.OrderItemId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne<MenuItem>()
            .WithMany()
            .HasForeignKey(x => x.MenuItemId)
            .OnDelete(DeleteBehavior.Restrict);
    }
}
