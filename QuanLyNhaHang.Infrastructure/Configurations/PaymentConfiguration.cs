using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using QuanLyNhaHang.Domain.Entities;

namespace QuanLyNhaHang.Infrastructure.Configurations;

public class PaymentConfiguration : IEntityTypeConfiguration<Payment>
{
    public void Configure(EntityTypeBuilder<Payment> builder)
    {
        builder.ToTable("Payments", table =>
        {
            table.HasCheckConstraint(
                "CK_Payments_Amounts_NonNegative",
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

        builder.Property(x => x.OrderId)
            .IsRequired();

        builder.Property(x => x.PaymentCode)
            .IsRequired()
            .HasMaxLength(50);

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

        builder.Property(x => x.PaidAt)
            .IsRequired();

        builder.Property(x => x.CreatedAt)
            .IsRequired();

        builder.Property(x => x.UpdatedAt)
            .IsRequired(false);

        builder.Property(x => x.RowVersion)
            .IsRowVersion();

        builder.HasIndex(x => x.PaymentCode)
            .IsUnique();

        builder.HasIndex(x => x.OrderId);

        // Keep cancelled/history rows, but the database must never accept two
        // simultaneously-paid records for one order. This is the last line of
        // defense when two valid gateway webhooks arrive at the same time.
        builder.HasIndex(x => new { x.OrderId, x.Status })
            .IsUnique()
            .HasFilter("[Status] = 'Paid'");

        builder.HasOne<Order>()
            .WithMany()
            .HasForeignKey(x => x.OrderId)
            .OnDelete(DeleteBehavior.Restrict);
    }
}
