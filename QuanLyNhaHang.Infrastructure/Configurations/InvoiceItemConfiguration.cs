using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using QuanLyNhaHang.Domain.Entities;

namespace QuanLyNhaHang.Infrastructure.Configurations;

public class InvoiceItemConfiguration : IEntityTypeConfiguration<InvoiceItem>
{
    public void Configure(EntityTypeBuilder<InvoiceItem> builder)
    {
        builder.ToTable("InvoiceItems");

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
    }
}