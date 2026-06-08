using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using QuanLyNhaHang.Domain.Entities;

namespace QuanLyNhaHang.Infrastructure.Configurations;

public class RevenueReportConfiguration : IEntityTypeConfiguration<RevenueReport>
{
    public void Configure(EntityTypeBuilder<RevenueReport> builder)
    {
        builder.ToTable("RevenueReports");

        builder.HasKey(x => x.Id);

        builder.Property(x => x.ReportCode)
            .IsRequired()
            .HasMaxLength(50);

        builder.Property(x => x.FromDate)
            .IsRequired();

        builder.Property(x => x.ToDate)
            .IsRequired();

        builder.Property(x => x.TotalInvoices)
            .IsRequired();

        builder.Property(x => x.TotalOrders)
            .IsRequired();

        builder.Property(x => x.TotalAmount)
            .IsRequired()
            .HasColumnType("decimal(18,2)");

        builder.Property(x => x.TotalDiscountAmount)
            .IsRequired()
            .HasColumnType("decimal(18,2)");

        builder.Property(x => x.TotalVatAmount)
            .IsRequired()
            .HasColumnType("decimal(18,2)");

        builder.Property(x => x.TotalRevenue)
            .IsRequired()
            .HasColumnType("decimal(18,2)");

        builder.Property(x => x.TotalCustomerPaid)
            .IsRequired()
            .HasColumnType("decimal(18,2)");

        builder.Property(x => x.TotalChangeAmount)
            .IsRequired()
            .HasColumnType("decimal(18,2)");

        builder.Property(x => x.AverageRevenuePerInvoice)
            .IsRequired()
            .HasColumnType("decimal(18,2)");

        builder.Property(x => x.Status)
            .IsRequired()
            .HasMaxLength(50);

        builder.Property(x => x.Note)
            .HasMaxLength(500);

        builder.Property(x => x.GeneratedAt)
            .IsRequired();

        builder.Property(x => x.CreatedAt)
            .IsRequired();

        builder.Property(x => x.UpdatedAt)
            .IsRequired(false);

        builder.HasIndex(x => x.ReportCode)
            .IsUnique();

        builder.HasIndex(x => x.FromDate);

        builder.HasIndex(x => x.ToDate);

        builder.HasIndex(x => x.Status);

        builder.HasIndex(x => new { x.FromDate, x.ToDate });

        builder.HasIndex(x => new { x.FromDate, x.ToDate, x.Status });
    }
}