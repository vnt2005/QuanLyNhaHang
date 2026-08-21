using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using QuanLyNhaHang.Domain.Entities;

namespace QuanLyNhaHang.Infrastructure.Configurations;

public sealed class PaymentAttemptConfiguration : IEntityTypeConfiguration<PaymentAttempt>
{
    public void Configure(EntityTypeBuilder<PaymentAttempt> builder)
    {
        builder.ToTable("PaymentAttempts");

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

        builder.HasIndex(x => new { x.Provider, x.ProviderOrderCode })
            .IsUnique();

        builder.HasIndex(x => x.ProviderPaymentLinkId)
            .IsUnique()
            .HasFilter("[ProviderPaymentLinkId] IS NOT NULL");

        builder.HasIndex(x => x.OrderId);
        builder.HasIndex(x => x.Status);

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