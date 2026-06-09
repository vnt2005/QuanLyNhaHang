using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using QuanLyNhaHang.Domain.Entities;

namespace QuanLyNhaHang.Infrastructure.Configurations;

public class TableOperationConfiguration : IEntityTypeConfiguration<TableOperation>
{
    public void Configure(EntityTypeBuilder<TableOperation> builder)
    {
        builder.ToTable("TableOperations");

        builder.HasKey(x => x.Id);

        builder.Property(x => x.OperationCode)
            .IsRequired()
            .HasMaxLength(50);

        builder.Property(x => x.OperationType)
            .IsRequired()
            .HasMaxLength(50);

        builder.Property(x => x.SourceTableId)
            .IsRequired();

        builder.Property(x => x.TargetTableId)
            .IsRequired(false);

        builder.Property(x => x.SourceOrderId)
            .IsRequired(false);

        builder.Property(x => x.TargetOrderId)
            .IsRequired(false);

        builder.Property(x => x.Status)
            .IsRequired()
            .HasMaxLength(50);

        builder.Property(x => x.Note)
            .HasMaxLength(500);

        builder.Property(x => x.CreatedAt)
            .IsRequired();

        builder.Property(x => x.CompletedAt)
            .IsRequired(false);

        builder.Property(x => x.UpdatedAt)
            .IsRequired(false);

        builder.HasIndex(x => x.OperationCode)
            .IsUnique();

        builder.HasIndex(x => x.OperationType);

        builder.HasIndex(x => x.SourceTableId);

        builder.HasIndex(x => x.TargetTableId);

        builder.HasIndex(x => x.SourceOrderId);

        builder.HasIndex(x => x.TargetOrderId);

        builder.HasIndex(x => x.Status);

        builder.HasIndex(x => x.CreatedAt);
    }
}