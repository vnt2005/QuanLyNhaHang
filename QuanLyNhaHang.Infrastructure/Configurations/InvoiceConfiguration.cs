using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using QuanLyNhaHang.Domain.Entities;

namespace QuanLyNhaHang.Infrastructure.Configurations;

public class InvoiceConfiguration : IEntityTypeConfiguration<Invoice>
{
    public void Configure(EntityTypeBuilder<Invoice> builder)
    {
        builder.ToTable("Invoices");

        builder.HasKey(x => x.Id);

        builder.Ignore(x => x.ServiceChargeAmount);

        builder.Property(x => x.OrderId).IsRequired();

        builder.Property(x => x.PaymentId).IsRequired();

        builder.Property(x => x.RestaurantTableId).IsRequired();

        builder.Property(x => x.InvoiceCode)
            .IsRequired()
            .HasMaxLength(50);

        builder.Property(x => x.OrderCode)
            .IsRequired()
            .HasMaxLength(50);

        builder.Property(x => x.PaymentCode)
            .IsRequired()
            .HasMaxLength(50);

        builder.Property(x => x.RestaurantTableName)
            .IsRequired()
            .HasMaxLength(150);

        builder.Property(x => x.TotalAmount)
            .IsRequired()
            .HasColumnType("decimal(18,2)");

        builder.Property(x => x.DiscountAmount)
            .IsRequired()
            .HasColumnType("decimal(18,2)");

        builder.Property(x => x.VatAmount)
            .IsRequired()
            .HasColumnType("decimal(18,2)");

        builder.Property(x => x.FinalAmount)
            .IsRequired()
            .HasColumnType("decimal(18,2)");

        builder.Property(x => x.CustomerPaid)
            .IsRequired()
            .HasColumnType("decimal(18,2)");

        builder.Property(x => x.ChangeAmount)
            .IsRequired()
            .HasColumnType("decimal(18,2)");

        builder.Property(x => x.PaymentMethod)
            .IsRequired()
            .HasMaxLength(50);

        builder.Property(x => x.Status)
            .IsRequired()
            .HasMaxLength(50);

        builder.Property(x => x.Note)
            .HasMaxLength(500);

        builder.Property(x => x.IssuedAt).IsRequired();

        builder.Property(x => x.CreatedAt).IsRequired();

        builder.Property(x => x.UpdatedAt).IsRequired(false);

        builder.HasIndex(x => x.InvoiceCode).IsUnique();

        builder.HasIndex(x => x.OrderId);

        builder.HasIndex(x => x.PaymentId)
            .IsUnique()
            .HasFilter("[Status] <> 'Cancelled'");
    }
}