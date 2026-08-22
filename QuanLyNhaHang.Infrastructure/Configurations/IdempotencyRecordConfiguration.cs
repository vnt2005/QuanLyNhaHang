using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using QuanLyNhaHang.Domain.Entities;

namespace QuanLyNhaHang.Infrastructure.Configurations;

public sealed class IdempotencyRecordConfiguration
    : IEntityTypeConfiguration<IdempotencyRecord>
{
    public void Configure(EntityTypeBuilder<IdempotencyRecord> builder)
    {
        builder.ToTable(
            "IdempotencyRecords",
            table => table.HasCheckConstraint(
                "CK_IdempotencyRecords_StatusCode",
                "[StatusCode] IS NULL OR ([StatusCode] >= 200 AND [StatusCode] < 400)"));

        builder.HasKey(item => item.Id);

        builder.Property(item => item.Scope)
            .IsRequired()
            .HasMaxLength(100);

        builder.Property(item => item.Actor)
            .IsRequired()
            .HasMaxLength(150);

        builder.Property(item => item.Key)
            .IsRequired()
            .HasMaxLength(128);

        builder.Property(item => item.RequestHash)
            .IsRequired()
            .HasMaxLength(64)
            .IsFixedLength();

        builder.Property(item => item.ContentType)
            .HasMaxLength(150);

        builder.Property(item => item.ResponseBody)
            .HasColumnType("nvarchar(max)");

        builder.Property(item => item.CreatedAt)
            .IsRequired();

        builder.Property(item => item.ExpiresAt)
            .IsRequired();

        builder.Ignore(item => item.IsCompleted);

        builder.HasIndex(item => new
            {
                item.Scope,
                item.Actor,
                item.Key
            })
            .IsUnique()
            .HasDatabaseName("UX_IdempotencyRecords_Scope_Actor_Key");

        builder.HasIndex(item => item.ExpiresAt)
            .HasDatabaseName("IX_IdempotencyRecords_ExpiresAt");
    }
}

