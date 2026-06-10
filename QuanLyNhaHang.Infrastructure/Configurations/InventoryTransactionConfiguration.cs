using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using QuanLyNhaHang.Domain.Entities;

namespace QuanLyNhaHang.Infrastructure.Configurations;

public class InventoryTransactionConfiguration : IEntityTypeConfiguration<InventoryTransaction>
{
    public void Configure(EntityTypeBuilder<InventoryTransaction> builder)
    {
        builder.ToTable("InventoryTransactions");

        builder.HasKey(x => x.Id);

        builder.Property(x => x.TransactionCode)
            .IsRequired()
            .HasMaxLength(100);

        builder.Property(x => x.IngredientId)
            .IsRequired();

        builder.Property(x => x.TransactionType)
            .IsRequired()
            .HasMaxLength(50);

        builder.Property(x => x.Quantity)
            .IsRequired()
            .HasColumnType("decimal(18,3)");

        builder.Property(x => x.UnitPrice)
            .IsRequired()
            .HasColumnType("decimal(18,2)");

        builder.Property(x => x.TotalAmount)
            .IsRequired()
            .HasColumnType("decimal(18,2)");

        builder.Property(x => x.StockBefore)
            .IsRequired()
            .HasColumnType("decimal(18,3)");

        builder.Property(x => x.StockAfter)
            .IsRequired()
            .HasColumnType("decimal(18,3)");

        builder.Property(x => x.Status)
            .IsRequired()
            .HasMaxLength(50);

        builder.Property(x => x.Note)
            .HasMaxLength(500);

        builder.Property(x => x.TransactionDate)
            .IsRequired();

        builder.Property(x => x.CreatedAt)
            .IsRequired();

        builder.Property(x => x.CancelledAt)
            .IsRequired(false);

        builder.HasIndex(x => x.TransactionCode)
            .IsUnique();

        builder.HasIndex(x => x.IngredientId);

        builder.HasIndex(x => x.TransactionType);

        builder.HasIndex(x => x.Status);

        builder.HasIndex(x => x.TransactionDate);

        builder.HasIndex(x => new
        {
            x.IngredientId,
            x.TransactionType,
            x.Status
        });

        builder.HasOne<Ingredient>()
            .WithMany()
            .HasForeignKey(x => x.IngredientId)
            .OnDelete(DeleteBehavior.Restrict);
    }
}