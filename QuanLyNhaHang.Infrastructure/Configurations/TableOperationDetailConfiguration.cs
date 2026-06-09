using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using QuanLyNhaHang.Domain.Entities;

namespace QuanLyNhaHang.Infrastructure.Configurations;

public class TableOperationDetailConfiguration : IEntityTypeConfiguration<TableOperationDetail>
{
    public void Configure(EntityTypeBuilder<TableOperationDetail> builder)
    {
        builder.ToTable("TableOperationDetails");

        builder.HasKey(x => x.Id);

        builder.Property(x => x.TableOperationId)
            .IsRequired();

        builder.Property(x => x.FromOrderId)
            .IsRequired(false);

        builder.Property(x => x.ToOrderId)
            .IsRequired(false);

        builder.Property(x => x.OrderItemId)
            .IsRequired(false);

        builder.Property(x => x.MenuItemId)
            .IsRequired(false);

        builder.Property(x => x.MenuItemName)
            .HasMaxLength(150);

        builder.Property(x => x.Quantity)
            .IsRequired();

        builder.Property(x => x.UnitPrice)
            .IsRequired()
            .HasColumnType("decimal(18,2)");

        builder.Property(x => x.TotalPrice)
            .IsRequired()
            .HasColumnType("decimal(18,2)");

        builder.Property(x => x.Note)
            .HasMaxLength(500);

        builder.Property(x => x.CreatedAt)
            .IsRequired();

        builder.HasIndex(x => x.TableOperationId);

        builder.HasIndex(x => x.FromOrderId);

        builder.HasIndex(x => x.ToOrderId);

        builder.HasIndex(x => x.OrderItemId);

        builder.HasIndex(x => x.MenuItemId);

        builder.HasIndex(x => x.CreatedAt);
    }
}