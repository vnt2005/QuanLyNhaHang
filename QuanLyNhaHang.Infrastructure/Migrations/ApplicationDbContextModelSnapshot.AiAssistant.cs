using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata;

namespace QuanLyNhaHang.Infrastructure.Migrations;

// The AI migration was added manually, so keep the runtime snapshot model in sync
// with the mapped RestaurantSetting fields. EF Core 10 validates this snapshot
// before MigrateAsync() and aborts startup when it detects pending model changes.
partial class ApplicationDbContextModelSnapshot
{
    private IModel? _aiAssistantAwareModel;

    public override IModel Model
    {
        get
        {
            if (_aiAssistantAwareModel is not null)
                return _aiAssistantAwareModel;

            var modelBuilder = new ModelBuilder();
            BuildModel(modelBuilder);

            modelBuilder.Entity("QuanLyNhaHang.Domain.Entities.RestaurantSetting", b =>
            {
                b.Property<bool>("AiAssistantEnabled")
                    .ValueGeneratedOnAdd()
                    .HasColumnType("bit")
                    .HasDefaultValue(false);

                b.Property<string>("AiAssistantKnowledgeBase")
                    .HasColumnType("nvarchar(max)");

                b.Property<int>("AiAssistantMaxOutputTokens")
                    .ValueGeneratedOnAdd()
                    .HasColumnType("int")
                    .HasDefaultValue(500);

                b.Property<string>("AiAssistantModel")
                    .IsRequired()
                    .ValueGeneratedOnAdd()
                    .HasMaxLength(100)
                    .HasColumnType("nvarchar(100)")
                    .HasDefaultValue("gpt-5.6-luna");

                b.Property<string>("AiAssistantSuggestedQuestions")
                    .HasMaxLength(4000)
                    .HasColumnType("nvarchar(4000)");

                b.Property<string>("AiAssistantSystemPrompt")
                    .HasMaxLength(8000)
                    .HasColumnType("nvarchar(8000)");

                b.Property<string>("AiAssistantWelcomeMessage")
                    .HasMaxLength(1000)
                    .HasColumnType("nvarchar(1000)");
            });

            _aiAssistantAwareModel = modelBuilder.Model;
            return _aiAssistantAwareModel;
        }
    }
}
