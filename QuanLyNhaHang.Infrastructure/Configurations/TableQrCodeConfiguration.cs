using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using QuanLyNhaHang.Domain.Entities;

namespace QuanLyNhaHang.Infrastructure.Configurations;

public class TableQrCodeConfiguration : IEntityTypeConfiguration<TableQrCode>
{
    public void Configure(EntityTypeBuilder<TableQrCode> builder)
    {
        builder.ToTable("TableQrCodes");

        builder.HasKey(x => x.Id);

        builder.Property(x => x.RestaurantTableId)
            .IsRequired();

        builder.Property(x => x.Token)
            .IsRequired()
            .HasMaxLength(200);

        builder.Property(x => x.QrCodeUrl)
            .IsRequired()
            .HasMaxLength(1000);

        builder.Property(x => x.Status)
            .IsRequired()
            .HasMaxLength(50);

        builder.Property(x => x.Note)
            .HasMaxLength(500);

        builder.Property(x => x.IsActive)
            .IsRequired();

        builder.Property(x => x.CreatedAt)
            .IsRequired();

        builder.Property(x => x.UpdatedAt)
            .IsRequired(false);

        builder.HasIndex(x => x.RestaurantTableId)
            .IsUnique();

        builder.HasIndex(x => x.Token)
            .IsUnique();

        builder.HasIndex(x => x.Status);

        builder.HasIndex(x => x.IsActive);
    }
}