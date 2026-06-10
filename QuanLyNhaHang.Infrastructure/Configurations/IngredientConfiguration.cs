using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;
using QuanLyNhaHang.Domain.Entities;

namespace QuanLyNhaHang.Infrastructure.Configurations;

public class IngredientConfiguration : IEntityTypeConfiguration<Ingredient>
{
    public void Configure(EntityTypeBuilder<Ingredient> builder)
    {
        builder.ToTable("Ingredients");

        builder.HasKey(x => x.Id);

        builder.Property(x => x.IngredientCategoryId)
            .IsRequired();

        builder.Property(x => x.IngredientCode)
            .IsRequired()
            .HasMaxLength(100);

        builder.Property(x => x.Name)
            .IsRequired()
            .HasMaxLength(200);

        builder.Property(x => x.Unit)
            .IsRequired()
            .HasMaxLength(50);

        builder.Property(x => x.CurrentStock)
            .IsRequired()
            .HasColumnType("decimal(18,3)");

        builder.Property(x => x.MinimumStock)
            .IsRequired()
            .HasColumnType("decimal(18,3)");

        builder.Property(x => x.CostPrice)
            .IsRequired()
            .HasColumnType("decimal(18,2)");

        builder.Property(x => x.Note)
            .HasMaxLength(500);

        builder.Property(x => x.IsActive)
            .IsRequired();

        builder.Property(x => x.CreatedAt)
            .IsRequired();

        builder.Property(x => x.UpdatedAt)
            .IsRequired(false);

        builder.HasIndex(x => x.IngredientCode)
            .IsUnique();

        builder.HasIndex(x => x.Name);

        builder.HasIndex(x => x.IngredientCategoryId);

        builder.HasIndex(x => x.IsActive);

        builder.HasIndex(x => new
        {
            x.IngredientCategoryId,
            x.IsActive
        });

        builder.HasOne<IngredientCategory>()
            .WithMany()
            .HasForeignKey(x => x.IngredientCategoryId)
            .OnDelete(DeleteBehavior.Restrict);
    }
}