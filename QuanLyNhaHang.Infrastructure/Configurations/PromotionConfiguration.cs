using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using QuanLyNhaHang.Domain.Entities;

namespace QuanLyNhaHang.Infrastructure.Configurations;

public class PromotionConfiguration : IEntityTypeConfiguration<Promotion>
{
    public void Configure(EntityTypeBuilder<Promotion> builder)
    {
        builder.ToTable("Promotions");

        builder.HasKey(x => x.Id);

        builder.Property(x => x.PromotionCode)
            .IsRequired()
            .HasMaxLength(100);

        builder.Property(x => x.Name)
            .IsRequired()
            .HasMaxLength(200);

        builder.Property(x => x.Description)
            .HasMaxLength(500);

        builder.Property(x => x.DiscountType)
            .IsRequired()
            .HasMaxLength(50);

        builder.Property(x => x.DiscountValue)
            .IsRequired()
            .HasColumnType("decimal(18,2)");

        builder.Property(x => x.MinimumOrderAmount)
            .IsRequired()
            .HasColumnType("decimal(18,2)");

        builder.Property(x => x.MaximumDiscountAmount)
            .IsRequired(false)
            .HasColumnType("decimal(18,2)");

        builder.Property(x => x.StartDate)
            .IsRequired();

        builder.Property(x => x.EndDate)
            .IsRequired();

        builder.Property(x => x.UsageLimit)
            .IsRequired(false);

        builder.Property(x => x.UsedCount)
            .IsRequired();

        builder.Property(x => x.IsActive)
            .IsRequired();

        builder.Property(x => x.CreatedAt)
            .IsRequired();

        builder.Property(x => x.UpdatedAt)
            .IsRequired(false);

        builder.HasIndex(x => x.PromotionCode)
            .IsUnique();

        builder.HasIndex(x => x.Name);

        builder.HasIndex(x => x.DiscountType);

        builder.HasIndex(x => x.StartDate);

        builder.HasIndex(x => x.EndDate);

        builder.HasIndex(x => x.IsActive);

        builder.HasIndex(x => new
        {
            x.StartDate,
            x.EndDate,
            x.IsActive
        });
    }
}