using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace QuanLyNhaHang.Infrastructure.Migrations;

public partial class AddPaymentAttempts : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.CreateTable(
            name: "PaymentAttempts",
            columns: table => new
            {
                Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                OrderId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                PaymentId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                Provider = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                ProviderOrderCode = table.Column<long>(type: "bigint", nullable: false),
                ProviderPaymentLinkId = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: true),
                ProviderReference = table.Column<string>(type: "nvarchar(150)", maxLength: 150, nullable: true),
                ProviderStatus = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: true),
                Amount = table.Column<decimal>(type: "decimal(18,2)", nullable: false),
                ReceivedAmount = table.Column<decimal>(type: "decimal(18,2)", nullable: true),
                Status = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                CheckoutUrl = table.Column<string>(type: "nvarchar(2048)", maxLength: 2048, nullable: true),
                ReviewReason = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: true),
                ExpiresAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                PaidAt = table.Column<DateTime>(type: "datetime2", nullable: true)
            },
            constraints: table =>
            {
                table.PrimaryKey("PK_PaymentAttempts", x => x.Id);
                table.ForeignKey(
                    name: "FK_PaymentAttempts_Orders_OrderId",
                    column: x => x.OrderId,
                    principalTable: "Orders",
                    principalColumn: "Id",
                    onDelete: ReferentialAction.Restrict);
                table.ForeignKey(
                    name: "FK_PaymentAttempts_Payments_PaymentId",
                    column: x => x.PaymentId,
                    principalTable: "Payments",
                    principalColumn: "Id",
                    onDelete: ReferentialAction.Restrict);
            });

        migrationBuilder.CreateIndex(
            name: "IX_PaymentAttempts_OrderId",
            table: "PaymentAttempts",
            column: "OrderId");

        migrationBuilder.CreateIndex(
            name: "IX_PaymentAttempts_PaymentId",
            table: "PaymentAttempts",
            column: "PaymentId");

        migrationBuilder.CreateIndex(
            name: "IX_PaymentAttempts_Provider_ProviderOrderCode",
            table: "PaymentAttempts",
            columns: new[] { "Provider", "ProviderOrderCode" },
            unique: true);

        migrationBuilder.CreateIndex(
            name: "IX_PaymentAttempts_ProviderPaymentLinkId",
            table: "PaymentAttempts",
            column: "ProviderPaymentLinkId",
            unique: true,
            filter: "[ProviderPaymentLinkId] IS NOT NULL");

        migrationBuilder.CreateIndex(
            name: "IX_PaymentAttempts_Status",
            table: "PaymentAttempts",
            column: "Status");
    }

    protected override void Down(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.DropTable(name: "PaymentAttempts");
    }
}