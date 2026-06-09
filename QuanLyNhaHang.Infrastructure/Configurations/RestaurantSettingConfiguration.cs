using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using QuanLyNhaHang.Domain.Entities;

namespace QuanLyNhaHang.Infrastructure.Configurations;

public class RestaurantSettingConfiguration : IEntityTypeConfiguration<RestaurantSetting>
{
    public void Configure(EntityTypeBuilder<RestaurantSetting> builder)
    {
        builder.ToTable("RestaurantSettings");

        builder.HasKey(x => x.Id);

        builder.Property(x => x.RestaurantName)
            .IsRequired()
            .HasMaxLength(200);

        builder.Property(x => x.Address)
            .IsRequired()
            .HasMaxLength(500);

        builder.Property(x => x.PhoneNumber)
            .IsRequired()
            .HasMaxLength(20);

        builder.Property(x => x.Email)
            .HasMaxLength(150);

        builder.Property(x => x.TaxCode)
            .HasMaxLength(50);

        builder.Property(x => x.WebsiteUrl)
            .HasMaxLength(300);

        builder.Property(x => x.LogoUrl)
            .HasMaxLength(500);

        builder.Property(x => x.DefaultVatPercent)
            .IsRequired()
            .HasColumnType("decimal(18,2)");

        builder.Property(x => x.ServiceChargePercent)
            .IsRequired()
            .HasColumnType("decimal(18,2)");

        builder.Property(x => x.Currency)
            .IsRequired()
            .HasMaxLength(20);

        builder.Property(x => x.OpeningTime)
            .IsRequired()
            .HasMaxLength(20);

        builder.Property(x => x.ClosingTime)
            .IsRequired()
            .HasMaxLength(20);

        builder.Property(x => x.InvoiceFooter)
            .HasMaxLength(1000);

        builder.Property(x => x.QrOrderWelcomeMessage)
            .HasMaxLength(1000);

        builder.Property(x => x.IsActive)
            .IsRequired();

        builder.Property(x => x.CreatedAt)
            .IsRequired();

        builder.Property(x => x.UpdatedAt)
            .IsRequired(false);

        builder.HasIndex(x => x.RestaurantName);

        builder.HasIndex(x => x.PhoneNumber);

        builder.HasIndex(x => x.Email);

        builder.HasIndex(x => x.TaxCode);

        builder.HasIndex(x => x.IsActive);
    }
}