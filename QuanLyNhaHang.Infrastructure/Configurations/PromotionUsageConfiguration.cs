using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using QuanLyNhaHang.Domain.Entities;

namespace QuanLyNhaHang.Infrastructure.Configurations;

public class PromotionUsageConfiguration : IEntityTypeConfiguration<PromotionUsage>
{
    public void Configure(EntityTypeBuilder<PromotionUsage> builder)
    {
        builder.ToTable("PromotionUsages");

        builder.HasKey(x => x.Id);

        builder.Property(x => x.PromotionId)
            .IsRequired();

        builder.Property(x => x.OrderId)
            .IsRequired();

        builder.Property(x => x.PaymentId)
            .IsRequired(false);

        builder.Property(x => x.PromotionCode)
            .IsRequired()
            .HasMaxLength(100);

        builder.Property(x => x.OrderAmount)
            .IsRequired()
            .HasColumnType("decimal(18,2)");

        builder.Property(x => x.DiscountAmount)
            .IsRequired()
            .HasColumnType("decimal(18,2)");

        builder.Property(x => x.Status)
            .IsRequired()
            .HasMaxLength(50);

        builder.Property(x => x.Note)
            .HasMaxLength(500);

        builder.Property(x => x.UsedAt)
            .IsRequired();

        builder.Property(x => x.CancelledAt)
            .IsRequired(false);

        builder.HasIndex(x => x.PromotionId);

        builder.HasIndex(x => x.OrderId);

        builder.HasIndex(x => x.PaymentId);

        builder.HasIndex(x => x.PromotionCode);

        builder.HasIndex(x => x.Status);

        builder.HasIndex(x => x.UsedAt);

        builder.HasIndex(x => new
        {
            x.PromotionId,
            x.OrderId,
            x.Status
        });

        builder.HasOne<Promotion>()
            .WithMany()
            .HasForeignKey(x => x.PromotionId)
            .OnDelete(DeleteBehavior.Restrict);
    }
}