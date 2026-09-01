using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;
using QuanLyNhaHang.Infrastructure.Persistence;

#nullable disable

namespace QuanLyNhaHang.Infrastructure.Migrations;

[DbContext(typeof(ApplicationDbContext))]
[Migration("20260901133000_SwitchAiAssistantProviderToGemini")]
public partial class SwitchAiAssistantProviderToGemini : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.Sql(
            """
            IF COL_LENGTH(N'dbo.RestaurantSettings', N'AiAssistantModel') IS NOT NULL
            BEGIN
                UPDATE dbo.RestaurantSettings
                SET AiAssistantModel = N'gemini-3.7-flash'
                WHERE AiAssistantModel IS NULL
                   OR LTRIM(RTRIM(AiAssistantModel)) = N''
                   OR AiAssistantModel LIKE N'gpt-%';

                DECLARE @defaultConstraint sysname;
                SELECT @defaultConstraint = dc.name
                FROM sys.default_constraints dc
                INNER JOIN sys.columns c
                    ON c.default_object_id = dc.object_id
                WHERE dc.parent_object_id = OBJECT_ID(N'dbo.RestaurantSettings')
                  AND c.name = N'AiAssistantModel';

                IF @defaultConstraint IS NOT NULL
                    EXEC(N'ALTER TABLE dbo.RestaurantSettings DROP CONSTRAINT [' + @defaultConstraint + N']');

                ALTER TABLE dbo.RestaurantSettings
                    ADD CONSTRAINT DF_RestaurantSettings_AiAssistantModel
                    DEFAULT (N'gemini-3.7-flash') FOR AiAssistantModel;
            END;
            """);
    }

    protected override void Down(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.Sql(
            """
            IF COL_LENGTH(N'dbo.RestaurantSettings', N'AiAssistantModel') IS NOT NULL
            BEGIN
                UPDATE dbo.RestaurantSettings
                SET AiAssistantModel = N'gpt-5.6-luna'
                WHERE AiAssistantModel = N'gemini-3.7-flash';

                DECLARE @defaultConstraint sysname;
                SELECT @defaultConstraint = dc.name
                FROM sys.default_constraints dc
                INNER JOIN sys.columns c
                    ON c.default_object_id = dc.object_id
                WHERE dc.parent_object_id = OBJECT_ID(N'dbo.RestaurantSettings')
                  AND c.name = N'AiAssistantModel';

                IF @defaultConstraint IS NOT NULL
                    EXEC(N'ALTER TABLE dbo.RestaurantSettings DROP CONSTRAINT [' + @defaultConstraint + N']');

                ALTER TABLE dbo.RestaurantSettings
                    ADD CONSTRAINT DF_RestaurantSettings_AiAssistantModel
                    DEFAULT (N'gpt-5.6-luna') FOR AiAssistantModel;
            END;
            """);
    }
}
