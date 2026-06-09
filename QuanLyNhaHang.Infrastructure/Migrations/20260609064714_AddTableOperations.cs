using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace QuanLyNhaHang.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class AddTableOperations : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "TableOperationDetails",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    TableOperationId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    FromOrderId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    ToOrderId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    OrderItemId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    MenuItemId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    MenuItemName = table.Column<string>(type: "nvarchar(150)", maxLength: 150, nullable: true),
                    Quantity = table.Column<int>(type: "int", nullable: false),
                    UnitPrice = table.Column<decimal>(type: "decimal(18,2)", nullable: false),
                    TotalPrice = table.Column<decimal>(type: "decimal(18,2)", nullable: false),
                    Note = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_TableOperationDetails", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "TableOperations",
                columns: table => new
                {
                    Id = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    OperationCode = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    OperationType = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    SourceTableId = table.Column<Guid>(type: "uniqueidentifier", nullable: false),
                    TargetTableId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    SourceOrderId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    TargetOrderId = table.Column<Guid>(type: "uniqueidentifier", nullable: true),
                    Status = table.Column<string>(type: "nvarchar(50)", maxLength: 50, nullable: false),
                    Note = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    CompletedAt = table.Column<DateTime>(type: "datetime2", nullable: true),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_TableOperations", x => x.Id);
                });

            migrationBuilder.CreateIndex(
                name: "IX_TableOperationDetails_CreatedAt",
                table: "TableOperationDetails",
                column: "CreatedAt");

            migrationBuilder.CreateIndex(
                name: "IX_TableOperationDetails_FromOrderId",
                table: "TableOperationDetails",
                column: "FromOrderId");

            migrationBuilder.CreateIndex(
                name: "IX_TableOperationDetails_MenuItemId",
                table: "TableOperationDetails",
                column: "MenuItemId");

            migrationBuilder.CreateIndex(
                name: "IX_TableOperationDetails_OrderItemId",
                table: "TableOperationDetails",
                column: "OrderItemId");

            migrationBuilder.CreateIndex(
                name: "IX_TableOperationDetails_TableOperationId",
                table: "TableOperationDetails",
                column: "TableOperationId");

            migrationBuilder.CreateIndex(
                name: "IX_TableOperationDetails_ToOrderId",
                table: "TableOperationDetails",
                column: "ToOrderId");

            migrationBuilder.CreateIndex(
                name: "IX_TableOperations_CreatedAt",
                table: "TableOperations",
                column: "CreatedAt");

            migrationBuilder.CreateIndex(
                name: "IX_TableOperations_OperationCode",
                table: "TableOperations",
                column: "OperationCode",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_TableOperations_OperationType",
                table: "TableOperations",
                column: "OperationType");

            migrationBuilder.CreateIndex(
                name: "IX_TableOperations_SourceOrderId",
                table: "TableOperations",
                column: "SourceOrderId");

            migrationBuilder.CreateIndex(
                name: "IX_TableOperations_SourceTableId",
                table: "TableOperations",
                column: "SourceTableId");

            migrationBuilder.CreateIndex(
                name: "IX_TableOperations_Status",
                table: "TableOperations",
                column: "Status");

            migrationBuilder.CreateIndex(
                name: "IX_TableOperations_TargetOrderId",
                table: "TableOperations",
                column: "TargetOrderId");

            migrationBuilder.CreateIndex(
                name: "IX_TableOperations_TargetTableId",
                table: "TableOperations",
                column: "TargetTableId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "TableOperationDetails");

            migrationBuilder.DropTable(
                name: "TableOperations");
        }
    }
}
