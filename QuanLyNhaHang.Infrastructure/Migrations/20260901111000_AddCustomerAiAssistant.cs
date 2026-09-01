using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;
using QuanLyNhaHang.Infrastructure.Persistence;

#nullable disable

namespace QuanLyNhaHang.Infrastructure.Migrations;

[DbContext(typeof(ApplicationDbContext))]
[Migration("20260901111000_AddCustomerAiAssistant")]
public partial class AddCustomerAiAssistant : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        // This migration deliberately guards every column creation. Local development keeps
        // the SQL Server volume between branches, and an interrupted/manual migration can
        // otherwise leave the schema ahead of __EFMigrationsHistory and make the API restart
        // forever. The guards make the migration safe to resume without deleting user data.
        migrationBuilder.Sql(
            """
            IF COL_LENGTH(N'dbo.RestaurantSettings', N'AiAssistantEnabled') IS NULL
            BEGIN
                ALTER TABLE dbo.RestaurantSettings
                    ADD AiAssistantEnabled bit NOT NULL
                        CONSTRAINT DF_RestaurantSettings_AiAssistantEnabled DEFAULT (0) WITH VALUES;
            END;

            IF COL_LENGTH(N'dbo.RestaurantSettings', N'AiAssistantModel') IS NULL
            BEGIN
                ALTER TABLE dbo.RestaurantSettings
                    ADD AiAssistantModel nvarchar(100) NOT NULL
                        CONSTRAINT DF_RestaurantSettings_AiAssistantModel DEFAULT (N'gpt-5.6-luna') WITH VALUES;
            END;

            IF COL_LENGTH(N'dbo.RestaurantSettings', N'AiAssistantWelcomeMessage') IS NULL
            BEGIN
                ALTER TABLE dbo.RestaurantSettings
                    ADD AiAssistantWelcomeMessage nvarchar(1000) NULL;
            END;

            IF COL_LENGTH(N'dbo.RestaurantSettings', N'AiAssistantSystemPrompt') IS NULL
            BEGIN
                ALTER TABLE dbo.RestaurantSettings
                    ADD AiAssistantSystemPrompt nvarchar(max) NULL;
            END;

            IF COL_LENGTH(N'dbo.RestaurantSettings', N'AiAssistantKnowledgeBase') IS NULL
            BEGIN
                ALTER TABLE dbo.RestaurantSettings
                    ADD AiAssistantKnowledgeBase nvarchar(max) NULL;
            END;

            IF COL_LENGTH(N'dbo.RestaurantSettings', N'AiAssistantSuggestedQuestions') IS NULL
            BEGIN
                ALTER TABLE dbo.RestaurantSettings
                    ADD AiAssistantSuggestedQuestions nvarchar(4000) NULL;
            END;

            IF COL_LENGTH(N'dbo.RestaurantSettings', N'AiAssistantMaxOutputTokens') IS NULL
            BEGIN
                ALTER TABLE dbo.RestaurantSettings
                    ADD AiAssistantMaxOutputTokens int NOT NULL
                        CONSTRAINT DF_RestaurantSettings_AiAssistantMaxOutputTokens DEFAULT (500) WITH VALUES;
            END;
            """);

        migrationBuilder.Sql(
            """
            UPDATE dbo.RestaurantSettings
            SET AiAssistantModel = COALESCE(NULLIF(LTRIM(RTRIM(AiAssistantModel)), N''), N'gpt-5.6-luna'),
                AiAssistantMaxOutputTokens = CASE
                    WHEN AiAssistantMaxOutputTokens BETWEEN 100 AND 2000 THEN AiAssistantMaxOutputTokens
                    ELSE 500
                END,
                AiAssistantWelcomeMessage = COALESCE(
                    AiAssistantWelcomeMessage,
                    N'Xin chào! Tôi là trợ lý AI của nhà hàng. Tôi có thể gợi ý món, giải đáp về thực đơn, khuyến mãi và cách đặt bàn.'
                ),
                AiAssistantSystemPrompt = COALESCE(
                    AiAssistantSystemPrompt,
                    N'Bạn là trợ lý chăm sóc khách hàng của nhà hàng. Chỉ trả lời trong phạm vi thông tin nhà hàng được cung cấp; nếu không chắc, hãy nói rõ và hướng khách liên hệ nhân viên. Không tự bịa giá, khuyến mãi, trạng thái đơn hàng hay chính sách.'
                ),
                AiAssistantSuggestedQuestions = COALESCE(
                    AiAssistantSuggestedQuestions,
                    N'Hôm nay có món gì nổi bật?' + CHAR(10) +
                    N'Có khuyến mãi nào đang áp dụng?' + CHAR(10) +
                    N'Tôi muốn đặt bàn thì làm thế nào?'
                );
            """);
    }

    protected override void Down(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.Sql(
            """
            IF COL_LENGTH(N'dbo.RestaurantSettings', N'AiAssistantMaxOutputTokens') IS NOT NULL
            BEGIN
                DECLARE @dfMaxTokens sysname;
                SELECT @dfMaxTokens = dc.name
                FROM sys.default_constraints dc
                INNER JOIN sys.columns c
                    ON c.default_object_id = dc.object_id
                WHERE dc.parent_object_id = OBJECT_ID(N'dbo.RestaurantSettings')
                  AND c.name = N'AiAssistantMaxOutputTokens';
                IF @dfMaxTokens IS NOT NULL
                    EXEC(N'ALTER TABLE dbo.RestaurantSettings DROP CONSTRAINT [' + @dfMaxTokens + N']');
                ALTER TABLE dbo.RestaurantSettings DROP COLUMN AiAssistantMaxOutputTokens;
            END;

            IF COL_LENGTH(N'dbo.RestaurantSettings', N'AiAssistantSuggestedQuestions') IS NOT NULL
                ALTER TABLE dbo.RestaurantSettings DROP COLUMN AiAssistantSuggestedQuestions;

            IF COL_LENGTH(N'dbo.RestaurantSettings', N'AiAssistantKnowledgeBase') IS NOT NULL
                ALTER TABLE dbo.RestaurantSettings DROP COLUMN AiAssistantKnowledgeBase;

            IF COL_LENGTH(N'dbo.RestaurantSettings', N'AiAssistantSystemPrompt') IS NOT NULL
                ALTER TABLE dbo.RestaurantSettings DROP COLUMN AiAssistantSystemPrompt;

            IF COL_LENGTH(N'dbo.RestaurantSettings', N'AiAssistantWelcomeMessage') IS NOT NULL
                ALTER TABLE dbo.RestaurantSettings DROP COLUMN AiAssistantWelcomeMessage;

            IF COL_LENGTH(N'dbo.RestaurantSettings', N'AiAssistantModel') IS NOT NULL
            BEGIN
                DECLARE @dfModel sysname;
                SELECT @dfModel = dc.name
                FROM sys.default_constraints dc
                INNER JOIN sys.columns c
                    ON c.default_object_id = dc.object_id
                WHERE dc.parent_object_id = OBJECT_ID(N'dbo.RestaurantSettings')
                  AND c.name = N'AiAssistantModel';
                IF @dfModel IS NOT NULL
                    EXEC(N'ALTER TABLE dbo.RestaurantSettings DROP CONSTRAINT [' + @dfModel + N']');
                ALTER TABLE dbo.RestaurantSettings DROP COLUMN AiAssistantModel;
            END;

            IF COL_LENGTH(N'dbo.RestaurantSettings', N'AiAssistantEnabled') IS NOT NULL
            BEGIN
                DECLARE @dfEnabled sysname;
                SELECT @dfEnabled = dc.name
                FROM sys.default_constraints dc
                INNER JOIN sys.columns c
                    ON c.default_object_id = dc.object_id
                WHERE dc.parent_object_id = OBJECT_ID(N'dbo.RestaurantSettings')
                  AND c.name = N'AiAssistantEnabled';
                IF @dfEnabled IS NOT NULL
                    EXEC(N'ALTER TABLE dbo.RestaurantSettings DROP CONSTRAINT [' + @dfEnabled + N']');
                ALTER TABLE dbo.RestaurantSettings DROP COLUMN AiAssistantEnabled;
            END;
            """);
    }
}
