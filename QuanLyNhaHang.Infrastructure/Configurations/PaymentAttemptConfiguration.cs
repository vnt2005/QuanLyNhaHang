using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using QuanLyNhaHang.Domain.Entities;

namespace QuanLyNhaHang.Infrastructure.Configurations;

public sealed class PaymentAttemptConfiguration : IEntityTypeConfiguration<PaymentAttempt>
{
    public void Configure(EntityTypeBuilder<PaymentAttempt> builder)
    {
        builder.ToTable("PaymentAttempts", table =>
        {
            table.HasCheckConstraint(
                "CK_PaymentAttempts_Amount_Positive",
                "[Amount] > 0");
            table.HasCheckConstraint(
                "CK_PaymentAttempts_ReceivedAmount_Positive",
                "[ReceivedAmount] IS NULL OR [ReceivedAmount] > 0");
        });

        builder.HasKey(x => x.Id);

        builder.Property(x => x.OrderId)
            .IsRequired();

        builder.Property(x => x.PaymentId)
            .IsRequired(false);

        builder.Property(x => x.Provider)
            .IsRequired()
            .HasMaxLength(50);

        builder.Property(x => x.ProviderOrderCode)
            .IsRequired();

        builder.Property(x => x.ProviderPaymentLinkId)
            .HasMaxLength(100);

        builder.Property(x => x.ProviderReference)
            .HasMaxLength(150);

        builder.Property(x => x.ProviderStatus)
            .HasMaxLength(50);

        builder.Property(x => x.Amount)
            .IsRequired()
            .HasColumnType("decimal(18,2)");

        builder.Property(x => x.ReceivedAmount)
            .HasColumnType("decimal(18,2)");

        builder.Property(x => x.Status)
            .IsRequired()
            .HasMaxLength(50);

        builder.Property(x => x.CheckoutUrl)
            .HasMaxLength(2048);

        builder.Property(x => x.ReviewReason)
            .HasMaxLength(500);

        builder.Property(x => x.ExpiresAt)
            .IsRequired();

        builder.Property(x => x.CreatedAt)
            .IsRequired();

        builder.Property(x => x.UpdatedAt)
            .IsRequired(false);

        builder.Property(x => x.PaidAt)
            .IsRequired(false);

        builder.Property(x => x.RowVersion)
            .IsRowVersion();

        builder.HasIndex(x => new { x.Provider, x.ProviderOrderCode })
            .IsUnique();

        builder.HasIndex(x => x.ProviderPaymentLinkId)
            .IsUnique()
            .HasFilter("[ProviderPaymentLinkId] IS NOT NULL");

        builder.HasIndex(x => x.OrderId);
        builder.HasIndex(x => x.Status);

        builder.HasIndex(x => new { x.OrderId, x.Provider })
            .IsUnique()
            .HasDatabaseName(
                "UX_PaymentAttempts_Order_Provider_Open")
            .HasFilter("[Status] IN ('Creating', 'Pending')");

        builder.HasIndex(x => new { x.Provider, x.ProviderReference })
            .IsUnique()
            .HasDatabaseName(
                "UX_PaymentAttempts_Provider_ProviderReference")
            .HasFilter("[ProviderReference] IS NOT NULL");

        builder.HasOne<Order>()
            .WithMany()
            .HasForeignKey(x => x.OrderId)
            .OnDelete(DeleteBehavior.Restrict);

        builder.HasOne<Payment>()
            .WithMany()
            .HasForeignKey(x => x.PaymentId)
            .OnDelete(DeleteBehavior.Restrict);
    }
}
