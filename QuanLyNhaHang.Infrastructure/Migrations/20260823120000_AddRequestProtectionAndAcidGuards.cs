using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;
using QuanLyNhaHang.Infrastructure.Persistence;

#nullable disable

namespace QuanLyNhaHang.Infrastructure.Migrations;

[DbContext(typeof(ApplicationDbContext))]
[Migration("20260823120000_AddRequestProtectionAndAcidGuards")]
public partial class AddRequestProtectionAndAcidGuards : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.AddColumn<byte[]>(
            name: "RowVersion",
            table: "RestaurantTables",
            type: "rowversion",
            rowVersion: true,
            nullable: false);

        migrationBuilder.AddColumn<byte[]>(
            name: "RowVersion",
            table: "Reservations",
            type: "rowversion",
            rowVersion: true,
            nullable: false);

        migrationBuilder.AddColumn<byte[]>(
            name: "RowVersion",
            table: "PaymentAttempts",
            type: "rowversion",
            rowVersion: true,
            nullable: false);

        migrationBuilder.AddColumn<byte[]>(
            name: "RowVersion",
            table: "Payments",
            type: "rowversion",
            rowVersion: true,
            nullable: false);

        migrationBuilder.AddColumn<byte[]>(
            name: "RowVersion",
            table: "OrderItems",
            type: "rowversion",
            rowVersion: true,
            nullable: false);

        migrationBuilder.AddColumn<byte[]>(
            name: "RowVersion",
            table: "Orders",
            type: "rowversion",
            rowVersion: true,
            nullable: false);

        migrationBuilder.AddColumn<byte[]>(
            name: "RowVersion",
            table: "Invoices",
            type: "rowversion",
            rowVersion: true,
            nullable: false);

        migrationBuilder.CreateTable(
            name: "IdempotencyRecords",
            columns: table => new
            {
                Id = table.Column<Guid>(
                    type: "uniqueidentifier",
                    nullable: false),
                Scope = table.Column<string>(
                    type: "nvarchar(100)",
                    maxLength: 100,
                    nullable: false),
                Actor = table.Column<string>(
                    type: "nvarchar(150)",
                    maxLength: 150,
                    nullable: false),
                Key = table.Column<string>(
                    type: "nvarchar(128)",
                    maxLength: 128,
                    nullable: false),
                RequestHash = table.Column<string>(
                    type: "nchar(64)",
                    fixedLength: true,
                    maxLength: 64,
                    nullable: false),
                StatusCode = table.Column<int>(
                    type: "int",
                    nullable: true),
                ContentType = table.Column<string>(
                    type: "nvarchar(150)",
                    maxLength: 150,
                    nullable: true),
                ResponseBody = table.Column<string>(
                    type: "nvarchar(max)",
                    nullable: true),
                CreatedAt = table.Column<DateTime>(
                    type: "datetime2",
                    nullable: false),
                ExpiresAt = table.Column<DateTime>(
                    type: "datetime2",
                    nullable: false)
            },
            constraints: table =>
            {
                table.PrimaryKey(
                    "PK_IdempotencyRecords",
                    item => item.Id);
                table.CheckConstraint(
                    "CK_IdempotencyRecords_StatusCode",
                    "[StatusCode] IS NULL OR ([StatusCode] >= 200 AND [StatusCode] < 400)");
            });

        migrationBuilder.AddCheckConstraint(
            name: "CK_RestaurantTables_Capacity_Positive",
            table: "RestaurantTables",
            sql: "[Capacity] > 0");

        migrationBuilder.AddCheckConstraint(
            name: "CK_Reservations_DepositAmount_NonNegative",
            table: "Reservations",
            sql: "[DepositAmount] >= 0");

        migrationBuilder.AddCheckConstraint(
            name: "CK_Reservations_NumberOfGuests_Positive",
            table: "Reservations",
            sql: "[NumberOfGuests] > 0");

        migrationBuilder.AddCheckConstraint(
            name: "CK_PaymentAttempts_Amount_Positive",
            table: "PaymentAttempts",
            sql: "[Amount] > 0");

        migrationBuilder.AddCheckConstraint(
            name: "CK_PaymentAttempts_ReceivedAmount_Positive",
            table: "PaymentAttempts",
            sql: "[ReceivedAmount] IS NULL OR [ReceivedAmount] > 0");

        migrationBuilder.AddCheckConstraint(
            name: "CK_Payments_Amounts_NonNegative",
            table: "Payments",
            sql: "[TotalAmount] >= 0 AND [DiscountAmount] >= 0 " +
                 "AND [VatAmount] >= 0 AND [FinalAmount] >= 0 " +
                 "AND [CustomerPaid] >= 0 AND [ChangeAmount] >= 0 " +
                 "AND [DiscountAmount] <= [TotalAmount] " +
                 "AND [FinalAmount] > 0 " +
                 "AND [CustomerPaid] >= [FinalAmount] " +
                 "AND [ChangeAmount] = [CustomerPaid] - [FinalAmount] " +
                 "AND [FinalAmount] - [TotalAmount] + [DiscountAmount] " +
                 "- [VatAmount] >= 0");

        migrationBuilder.AddCheckConstraint(
            name: "CK_OrderItems_Amounts_NonNegative",
            table: "OrderItems",
            sql: "[UnitPrice] >= 0 AND [TotalPrice] >= 0");

        migrationBuilder.AddCheckConstraint(
            name: "CK_OrderItems_Quantity_Range",
            table: "OrderItems",
            sql: "[Quantity] >= 1 AND [Quantity] <= 99");

        migrationBuilder.AddCheckConstraint(
            name: "CK_OrderItems_TotalPrice",
            table: "OrderItems",
            sql: "[TotalPrice] = [UnitPrice] * [Quantity]");

        migrationBuilder.AddCheckConstraint(
            name: "CK_Orders_OrderType",
            table: "Orders",
            sql: "[OrderType] IN ('DineIn', 'Takeaway')");

        migrationBuilder.AddCheckConstraint(
            name: "CK_Orders_TotalAmount_NonNegative",
            table: "Orders",
            sql: "[TotalAmount] >= 0");

        migrationBuilder.AddCheckConstraint(
            name: "CK_InvoiceItems_Amounts_NonNegative",
            table: "InvoiceItems",
            sql: "[UnitPrice] >= 0 AND [TotalPrice] >= 0");

        migrationBuilder.AddCheckConstraint(
            name: "CK_InvoiceItems_Quantity_Positive",
            table: "InvoiceItems",
            sql: "[Quantity] > 0");

        migrationBuilder.AddCheckConstraint(
            name: "CK_InvoiceItems_TotalPrice",
            table: "InvoiceItems",
            sql: "[TotalPrice] = [UnitPrice] * [Quantity]");

        migrationBuilder.AddCheckConstraint(
            name: "CK_Invoices_Amounts_NonNegative",
            table: "Invoices",
            sql: "[TotalAmount] >= 0 AND [DiscountAmount] >= 0 " +
                 "AND [VatAmount] >= 0 AND [FinalAmount] >= 0 " +
                 "AND [CustomerPaid] >= 0 AND [ChangeAmount] >= 0 " +
                 "AND [DiscountAmount] <= [TotalAmount] " +
                 "AND [FinalAmount] > 0 " +
                 "AND [CustomerPaid] >= [FinalAmount] " +
                 "AND [ChangeAmount] = [CustomerPaid] - [FinalAmount] " +
                 "AND [FinalAmount] - [TotalAmount] + [DiscountAmount] " +
                 "- [VatAmount] >= 0");

        migrationBuilder.CreateIndex(
            name: "IX_IdempotencyRecords_ExpiresAt",
            table: "IdempotencyRecords",
            column: "ExpiresAt");

        migrationBuilder.CreateIndex(
            name: "UX_IdempotencyRecords_Scope_Actor_Key",
            table: "IdempotencyRecords",
            columns: new[] { "Scope", "Actor", "Key" },
            unique: true);

        migrationBuilder.CreateIndex(
            name: "IX_RestaurantTables_AreaId",
            table: "RestaurantTables",
            column: "AreaId");

        migrationBuilder.CreateIndex(
            name: "UX_PaymentAttempts_Order_Provider_Open",
            table: "PaymentAttempts",
            columns: new[] { "OrderId", "Provider" },
            unique: true,
            filter: "[Status] IN ('Creating', 'Pending')");

        migrationBuilder.CreateIndex(
            name: "UX_PaymentAttempts_Provider_ProviderReference",
            table: "PaymentAttempts",
            columns: new[] { "Provider", "ProviderReference" },
            unique: true,
            filter: "[ProviderReference] IS NOT NULL");

        migrationBuilder.CreateIndex(
            name: "IX_OrderItems_MenuItemId",
            table: "OrderItems",
            column: "MenuItemId");

        migrationBuilder.CreateIndex(
            name: "IX_OrderItems_OrderId",
            table: "OrderItems",
            column: "OrderId");

        migrationBuilder.CreateIndex(
            name: "IX_Orders_RestaurantTableId_IsActive_Status",
            table: "Orders",
            columns: new[]
            {
                "RestaurantTableId",
                "IsActive",
                "Status"
            });

        migrationBuilder.CreateIndex(
            name: "IX_Invoices_RestaurantTableId",
            table: "Invoices",
            column: "RestaurantTableId");

        migrationBuilder.CreateIndex(
            name: "IX_InvoiceItems_MenuItemId",
            table: "InvoiceItems",
            column: "MenuItemId");

        migrationBuilder.CreateIndex(
            name: "IX_InvoiceItems_OrderItemId",
            table: "InvoiceItems",
            column: "OrderItemId");

        migrationBuilder.AddForeignKey(
            name: "FK_RestaurantTables_Areas_AreaId",
            table: "RestaurantTables",
            column: "AreaId",
            principalTable: "Areas",
            principalColumn: "Id",
            onDelete: ReferentialAction.Restrict);

        migrationBuilder.AddForeignKey(
            name: "FK_Reservations_RestaurantTables_RestaurantTableId",
            table: "Reservations",
            column: "RestaurantTableId",
            principalTable: "RestaurantTables",
            principalColumn: "Id",
            onDelete: ReferentialAction.Restrict);

        migrationBuilder.AddForeignKey(
            name: "FK_Payments_Orders_OrderId",
            table: "Payments",
            column: "OrderId",
            principalTable: "Orders",
            principalColumn: "Id",
            onDelete: ReferentialAction.Restrict);

        migrationBuilder.AddForeignKey(
            name: "FK_OrderItems_MenuItems_MenuItemId",
            table: "OrderItems",
            column: "MenuItemId",
            principalTable: "MenuItems",
            principalColumn: "Id",
            onDelete: ReferentialAction.Restrict);

        migrationBuilder.AddForeignKey(
            name: "FK_OrderItems_Orders_OrderId",
            table: "OrderItems",
            column: "OrderId",
            principalTable: "Orders",
            principalColumn: "Id",
            onDelete: ReferentialAction.Restrict);

        migrationBuilder.AddForeignKey(
            name: "FK_Orders_RestaurantTables_RestaurantTableId",
            table: "Orders",
            column: "RestaurantTableId",
            principalTable: "RestaurantTables",
            principalColumn: "Id",
            onDelete: ReferentialAction.Restrict);

        migrationBuilder.AddForeignKey(
            name: "FK_Invoices_Orders_OrderId",
            table: "Invoices",
            column: "OrderId",
            principalTable: "Orders",
            principalColumn: "Id",
            onDelete: ReferentialAction.Restrict);

        migrationBuilder.AddForeignKey(
            name: "FK_Invoices_Payments_PaymentId",
            table: "Invoices",
            column: "PaymentId",
            principalTable: "Payments",
            principalColumn: "Id",
            onDelete: ReferentialAction.Restrict);

        migrationBuilder.AddForeignKey(
            name: "FK_Invoices_RestaurantTables_RestaurantTableId",
            table: "Invoices",
            column: "RestaurantTableId",
            principalTable: "RestaurantTables",
            principalColumn: "Id",
            onDelete: ReferentialAction.Restrict);

        migrationBuilder.AddForeignKey(
            name: "FK_InvoiceItems_Invoices_InvoiceId",
            table: "InvoiceItems",
            column: "InvoiceId",
            principalTable: "Invoices",
            principalColumn: "Id",
            onDelete: ReferentialAction.Restrict);

        migrationBuilder.AddForeignKey(
            name: "FK_InvoiceItems_MenuItems_MenuItemId",
            table: "InvoiceItems",
            column: "MenuItemId",
            principalTable: "MenuItems",
            principalColumn: "Id",
            onDelete: ReferentialAction.Restrict);

        migrationBuilder.AddForeignKey(
            name: "FK_InvoiceItems_OrderItems_OrderItemId",
            table: "InvoiceItems",
            column: "OrderItemId",
            principalTable: "OrderItems",
            principalColumn: "Id",
            onDelete: ReferentialAction.Restrict);
    }

    protected override void Down(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.DropForeignKey(
            name: "FK_RestaurantTables_Areas_AreaId",
            table: "RestaurantTables");
        migrationBuilder.DropForeignKey(
            name: "FK_Reservations_RestaurantTables_RestaurantTableId",
            table: "Reservations");
        migrationBuilder.DropForeignKey(
            name: "FK_Payments_Orders_OrderId",
            table: "Payments");
        migrationBuilder.DropForeignKey(
            name: "FK_OrderItems_MenuItems_MenuItemId",
            table: "OrderItems");
        migrationBuilder.DropForeignKey(
            name: "FK_OrderItems_Orders_OrderId",
            table: "OrderItems");
        migrationBuilder.DropForeignKey(
            name: "FK_Orders_RestaurantTables_RestaurantTableId",
            table: "Orders");
        migrationBuilder.DropForeignKey(
            name: "FK_Invoices_Orders_OrderId",
            table: "Invoices");
        migrationBuilder.DropForeignKey(
            name: "FK_Invoices_Payments_PaymentId",
            table: "Invoices");
        migrationBuilder.DropForeignKey(
            name: "FK_Invoices_RestaurantTables_RestaurantTableId",
            table: "Invoices");
        migrationBuilder.DropForeignKey(
            name: "FK_InvoiceItems_Invoices_InvoiceId",
            table: "InvoiceItems");
        migrationBuilder.DropForeignKey(
            name: "FK_InvoiceItems_MenuItems_MenuItemId",
            table: "InvoiceItems");
        migrationBuilder.DropForeignKey(
            name: "FK_InvoiceItems_OrderItems_OrderItemId",
            table: "InvoiceItems");

        migrationBuilder.DropTable(name: "IdempotencyRecords");

        migrationBuilder.DropIndex(
            name: "IX_RestaurantTables_AreaId",
            table: "RestaurantTables");
        migrationBuilder.DropIndex(
            name: "UX_PaymentAttempts_Order_Provider_Open",
            table: "PaymentAttempts");
        migrationBuilder.DropIndex(
            name: "UX_PaymentAttempts_Provider_ProviderReference",
            table: "PaymentAttempts");
        migrationBuilder.DropIndex(
            name: "IX_OrderItems_MenuItemId",
            table: "OrderItems");
        migrationBuilder.DropIndex(
            name: "IX_OrderItems_OrderId",
            table: "OrderItems");
        migrationBuilder.DropIndex(
            name: "IX_Orders_RestaurantTableId_IsActive_Status",
            table: "Orders");
        migrationBuilder.DropIndex(
            name: "IX_Invoices_RestaurantTableId",
            table: "Invoices");
        migrationBuilder.DropIndex(
            name: "IX_InvoiceItems_MenuItemId",
            table: "InvoiceItems");
        migrationBuilder.DropIndex(
            name: "IX_InvoiceItems_OrderItemId",
            table: "InvoiceItems");

        migrationBuilder.DropCheckConstraint(
            name: "CK_RestaurantTables_Capacity_Positive",
            table: "RestaurantTables");
        migrationBuilder.DropCheckConstraint(
            name: "CK_Reservations_DepositAmount_NonNegative",
            table: "Reservations");
        migrationBuilder.DropCheckConstraint(
            name: "CK_Reservations_NumberOfGuests_Positive",
            table: "Reservations");
        migrationBuilder.DropCheckConstraint(
            name: "CK_PaymentAttempts_Amount_Positive",
            table: "PaymentAttempts");
        migrationBuilder.DropCheckConstraint(
            name: "CK_PaymentAttempts_ReceivedAmount_Positive",
            table: "PaymentAttempts");
        migrationBuilder.DropCheckConstraint(
            name: "CK_Payments_Amounts_NonNegative",
            table: "Payments");
        migrationBuilder.DropCheckConstraint(
            name: "CK_OrderItems_Amounts_NonNegative",
            table: "OrderItems");
        migrationBuilder.DropCheckConstraint(
            name: "CK_OrderItems_Quantity_Range",
            table: "OrderItems");
        migrationBuilder.DropCheckConstraint(
            name: "CK_OrderItems_TotalPrice",
            table: "OrderItems");
        migrationBuilder.DropCheckConstraint(
            name: "CK_Orders_OrderType",
            table: "Orders");
        migrationBuilder.DropCheckConstraint(
            name: "CK_Orders_TotalAmount_NonNegative",
            table: "Orders");
        migrationBuilder.DropCheckConstraint(
            name: "CK_InvoiceItems_Amounts_NonNegative",
            table: "InvoiceItems");
        migrationBuilder.DropCheckConstraint(
            name: "CK_InvoiceItems_Quantity_Positive",
            table: "InvoiceItems");
        migrationBuilder.DropCheckConstraint(
            name: "CK_InvoiceItems_TotalPrice",
            table: "InvoiceItems");
        migrationBuilder.DropCheckConstraint(
            name: "CK_Invoices_Amounts_NonNegative",
            table: "Invoices");

        migrationBuilder.DropColumn(name: "RowVersion", table: "RestaurantTables");
        migrationBuilder.DropColumn(name: "RowVersion", table: "Reservations");
        migrationBuilder.DropColumn(name: "RowVersion", table: "PaymentAttempts");
        migrationBuilder.DropColumn(name: "RowVersion", table: "Payments");
        migrationBuilder.DropColumn(name: "RowVersion", table: "OrderItems");
        migrationBuilder.DropColumn(name: "RowVersion", table: "Orders");
        migrationBuilder.DropColumn(name: "RowVersion", table: "Invoices");
    }
}
