using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;
using QuanLyNhaHang.Infrastructure.Persistence;

#nullable disable

namespace QuanLyNhaHang.Infrastructure.Migrations;

[DbContext(typeof(ApplicationDbContext))]
[Migration("20261028103000_SeedMenuItemImagesAndDescriptions")]
public partial class SeedMenuItemImagesAndDescriptions : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.Sql(
            """
            UPDATE dbo.MenuItems
            SET ImageUrl = N'https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&w=800&q=80',
                Description = N'Thịt gà thả vườn xé phay trộn cùng bắp cải giòn, rau răm, hành tím phi thơm và nước xốt chanh tắc thanh dịu.'
            WHERE Name = N'Gỏi Gà' AND (ImageUrl IS NULL OR ImageUrl = N'');

            UPDATE dbo.MenuItems
            SET ImageUrl = N'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?auto=format&fit=crop&w=800&q=80',
                Description = N'Nước dùng xương bò ninh chậm 8 giờ dậy hương sả, quế hồi, phục vụ kèm thịt bò tươi thái lát và rổ rau xanh tại bàn.'
            WHERE Name = N'Lẩu Bò' AND (ImageUrl IS NULL OR ImageUrl = N'');

            UPDATE dbo.MenuItems
            SET ImageUrl = N'https://images.unsplash.com/photo-1547496502-affa22d38842?auto=format&fit=crop&w=800&q=80',
                Description = N'Thịt dê tươi hầm mềm cùng thảo mộc ôn ấm, vị ngọt hậu đậm đà, thích hợp cho bữa tối quây quần bên gia đình.'
            WHERE Name = N'Lẩu Dê' AND (ImageUrl IS NULL OR ImageUrl = N'');

            UPDATE dbo.MenuItems
            SET ImageUrl = N'https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=800&q=80',
                Description = N'Cuốn thủ công giòn rụm với nhân tôm thịt, nấm mèo và miến dong, chấm cùng nước mắm chua ngọt pha tỏi ớt tươi.'
            WHERE Name = N'Chả Giò' AND (ImageUrl IS NULL OR ImageUrl = N'');

            UPDATE dbo.MenuItems
            SET ImageUrl = N'https://images.unsplash.com/photo-1467003909585-2f8a72700288?auto=format&fit=crop&w=800&q=80',
                Description = N'Phi lê cá hồi tươi áp chảo lửa vừa, giữ trọn vị béo mềm tự nhiên, dùng kèm xốt thảo mộc và rau mùa theo ngày.'
            WHERE Name = N'Cá Hồi' AND (ImageUrl IS NULL OR ImageUrl = N'');

            UPDATE dbo.MenuItems
            SET ImageUrl = N'https://images.unsplash.com/photo-1547592166-23ac45744acd?auto=format&fit=crop&w=800&q=80',
                Description = N'Súp nóng nấu sánh nhẹ từ nước dùng gà và hải sản tươi, điểm hương ngò rí và tiêu trắng xay mới.'
            WHERE Name = N'Súp' AND (ImageUrl IS NULL OR ImageUrl = N'');

            UPDATE dbo.MenuItems
            SET ImageUrl = N'https://images.unsplash.com/photo-1582878826629-29b7ad1cdc43?auto=format&fit=crop&w=800&q=80',
                Description = N'Vị chua thanh tự nhiên từ me chín, dứa tươi, cà chua và dọc mùng giòn, dậy hương rau ngổ và tỏi phi vàng.'
            WHERE Name = N'Canh Chua' AND (ImageUrl IS NULL OR ImageUrl = N'');

            UPDATE dbo.MenuItems
            SET ImageUrl = N'https://images.unsplash.com/photo-1534422298391-e4f8c172dddb?auto=format&fit=crop&w=800&q=80',
                Description = N'Món phụ cao cấp hầm kỹ với nước dùng thượng canh trong vắt, giàu dưỡng chất và hương vị tinh tế.'
            WHERE Name = N'Vi Cá Mập' AND (ImageUrl IS NULL OR ImageUrl = N'');

            UPDATE dbo.MenuItems
            SET ImageUrl = N'https://images.unsplash.com/photo-1537640538966-79f369143f8f?auto=format&fit=crop&w=800&q=80',
                Description = N'Nho tươi tuyển chọn theo mùa, ướp lạnh tự nhiên, vị ngọt thanh mát giúp cân bằng vị giác cuối bữa ăn.'
            WHERE Name = N'Nho' AND (ImageUrl IS NULL OR ImageUrl = N'');
            """);
    }

    protected override void Down(MigrationBuilder migrationBuilder)
    {
    }
}

