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
        migrationBuilder.AddColumn<bool>(
            name: "AiAssistantEnabled",
            table: "RestaurantSettings",
            type: "bit",
            nullable: false,
            defaultValue: false);

        migrationBuilder.AddColumn<string>(
            name: "AiAssistantModel",
            table: "RestaurantSettings",
            type: "nvarchar(100)",
            maxLength: 100,
            nullable: false,
            defaultValue: "gpt-5.6-luna");

        migrationBuilder.AddColumn<string>(
            name: "AiAssistantWelcomeMessage",
            table: "RestaurantSettings",
            type: "nvarchar(1000)",
            maxLength: 1000,
            nullable: true);

        migrationBuilder.AddColumn<string>(
            name: "AiAssistantSystemPrompt",
            table: "RestaurantSettings",
            type: "nvarchar(8000)",
            maxLength: 8000,
            nullable: true);

        migrationBuilder.AddColumn<string>(
            name: "AiAssistantKnowledgeBase",
            table: "RestaurantSettings",
            type: "nvarchar(max)",
            nullable: true);

        migrationBuilder.AddColumn<string>(
            name: "AiAssistantSuggestedQuestions",
            table: "RestaurantSettings",
            type: "nvarchar(4000)",
            maxLength: 4000,
            nullable: true);

        migrationBuilder.AddColumn<int>(
            name: "AiAssistantMaxOutputTokens",
            table: "RestaurantSettings",
            type: "int",
            nullable: false,
            defaultValue: 500);

        migrationBuilder.Sql(
            """
            UPDATE RestaurantSettings
            SET AiAssistantWelcomeMessage = N'Xin chào! Tôi là trợ lý AI của nhà hàng. Tôi có thể gợi ý món, giải đáp về thực đơn, khuyến mãi và cách đặt bàn.',
                AiAssistantSystemPrompt = N'Bạn là trợ lý chăm sóc khách hàng của nhà hàng. Chỉ trả lời trong phạm vi thông tin nhà hàng được cung cấp; nếu không chắc, hãy nói rõ và hướng khách liên hệ nhân viên. Không tự bịa giá, khuyến mãi, trạng thái đơn hàng hay chính sách.',
                AiAssistantSuggestedQuestions = N'Hôm nay có món gì nổi bật?' + CHAR(10) + N'Có khuyến mãi nào đang áp dụng?' + CHAR(10) + N'Tôi muốn đặt bàn thì làm thế nào?'
            WHERE AiAssistantWelcomeMessage IS NULL;
            """);
    }

    protected override void Down(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.DropColumn(
            name: "AiAssistantEnabled",
            table: "RestaurantSettings");

        migrationBuilder.DropColumn(
            name: "AiAssistantModel",
            table: "RestaurantSettings");

        migrationBuilder.DropColumn(
            name: "AiAssistantWelcomeMessage",
            table: "RestaurantSettings");

        migrationBuilder.DropColumn(
            name: "AiAssistantSystemPrompt",
            table: "RestaurantSettings");

        migrationBuilder.DropColumn(
            name: "AiAssistantKnowledgeBase",
            table: "RestaurantSettings");

        migrationBuilder.DropColumn(
            name: "AiAssistantSuggestedQuestions",
            table: "RestaurantSettings");

        migrationBuilder.DropColumn(
            name: "AiAssistantMaxOutputTokens",
            table: "RestaurantSettings");
    }
}
