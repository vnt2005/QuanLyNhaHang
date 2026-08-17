using System;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;
using QuanLyNhaHang.Infrastructure.Persistence;

#nullable disable

namespace QuanLyNhaHang.Infrastructure.Migrations;

[DbContext(typeof(ApplicationDbContext))]
[Migration("20260817073000_AddTakeawayOrders")]
public partial class AddTakeawayOrders : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.AlterColumn<Guid>(
            name: "RestaurantTableId",
            table: "Orders",
            type: "uniqueidentifier",
            nullable: true,
            oldClrType: typeof(Guid),
            oldType: "uniqueidentifier");

        migrationBuilder.AddColumn<string>(
            name: "OrderType",
            table: "Orders",
            type: "nvarchar(20)",
            maxLength: 20,
            nullable: false,
            defaultValue: "DineIn");

        migrationBuilder.AddColumn<string>(
            name: "CustomerName",
            table: "Orders",
            type: "nvarchar(150)",
            maxLength: 150,
            nullable: true);

        migrationBuilder.AddColumn<string>(
            name: "CustomerPhoneNumber",
            table: "Orders",
            type: "nvarchar(30)",
            maxLength: 30,
            nullable: true);

        migrationBuilder.AddColumn<DateTime>(
            name: "PickupTime",
            table: "Orders",
            type: "datetime2",
            nullable: true);
    }

    protected override void Down(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.Sql(
            "DELETE FROM [OrderItems] WHERE [OrderId] IN (SELECT [Id] FROM [Orders] WHERE [RestaurantTableId] IS NULL);");
        migrationBuilder.Sql(
            "DELETE FROM [Orders] WHERE [RestaurantTableId] IS NULL;");

        migrationBuilder.DropColumn(name: "PickupTime", table: "Orders");
        migrationBuilder.DropColumn(name: "CustomerPhoneNumber", table: "Orders");
        migrationBuilder.DropColumn(name: "CustomerName", table: "Orders");
        migrationBuilder.DropColumn(name: "OrderType", table: "Orders");

        migrationBuilder.AlterColumn<Guid>(
            name: "RestaurantTableId",
            table: "Orders",
            type: "uniqueidentifier",
            nullable: false,
            defaultValue: Guid.Empty,
            oldClrType: typeof(Guid),
            oldType: "uniqueidentifier",
            oldNullable: true);
    }
}
