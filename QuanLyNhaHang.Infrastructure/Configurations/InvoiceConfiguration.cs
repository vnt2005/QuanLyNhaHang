using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using QuanLyNhaHang.Domain.Entities;

namespace QuanLyNhaHang.Infrastructure.Configurations;

public class InvoiceConfiguration : IEntityTypeConfiguration<Invoice>
{
    public void Configure(EntityTypeBuilder<Invoice> builder)
    {
        builder.ToTable("Invoices", table =>
        {
            table.HasCheckConstraint(
                "CK_Invoices_Amounts_NonNegative",
                "[TotalAmount] >= 0 AND [DiscountAmount] >= 0 " +
                "AND [VatAmount] >= 0 AND [FinalAmount] >= 0 " +
                "AND [CustomerPaid] >= 0 AND [ChangeAmount] >= 0 " +
                "AND [DiscountAmount] <= [TotalAmount] " +
                "AND [FinalAmount] > 0 " +
                "AND [CustomerPaid] >= [FinalAmount] " +
                "AND [ChangeAmount] = [CustomerPaid] - [FinalAmount] " +
                "AND [FinalAmount] - [TotalAmount] + [DiscountAmount] " +
                "- [VatAmount] >= 0");
        });

        builder.HasKey(x => x.Id);

        builder.Ignore(x => x.ServiceChargeAmount);

        builder.Property(x => x.OrderId).IsRequired();

        builder.Property(x => x.PaymentId).IsRequired();

        builder.Property(x => x.RestaurantTableId).IsRequired(false);

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

        builder.Property(x => x.RowVersion)
            .IsRowVersion();

        builder.HasIndex(x => x.InvoiceCode).IsUnique();

        builder.HasIndex(x => x.OrderId);

        builder.HasIndex(x => x.PaymentId)
            .IsUnique()
            .HasFilter("[Status] <> 'Cancelled'");

        builder.HasOne<Order>()
            .WithMany()
            .HasForeignKey(x => x.OrderId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne<Payment>()
            .WithMany()
            .HasForeignKey(x => x.PaymentId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne<RestaurantTable>()
            .WithMany()
            .HasForeignKey(x => x.RestaurantTableId)
            .OnDelete(DeleteBehavior.Restrict);
    }
}
