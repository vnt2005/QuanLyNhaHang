using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using QuanLyNhaHang.Domain.Entities;

namespace QuanLyNhaHang.Infrastructure.Configurations;

public class RevenueReportItemConfiguration : IEntityTypeConfiguration<RevenueReportItem>
{
    public void Configure(EntityTypeBuilder<RevenueReportItem> builder)
    {
        builder.ToTable("RevenueReportItems");

        builder.HasKey(x => x.Id);

        builder.Property(x => x.RevenueReportId)
            .IsRequired();

        builder.Property(x => x.MenuItemId)
            .IsRequired();

        builder.Property(x => x.MenuItemName)
            .IsRequired()
            .HasMaxLength(150);

        builder.Property(x => x.QuantitySold)
            .IsRequired();

        builder.Property(x => x.TotalRevenue)
            .IsRequired()
            .HasColumnType("decimal(18,2)");

        builder.Property(x => x.CreatedAt)
            .IsRequired();

        builder.HasIndex(x => x.RevenueReportId);

        builder.HasIndex(x => x.MenuItemId);

        builder.HasIndex(x => x.MenuItemName);
    }
}