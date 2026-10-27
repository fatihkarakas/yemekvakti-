using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace YemekVakti.Api.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddRoomConfirmedFields : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "ConfirmedBy",
                table: "yv_Rooms",
                type: "nvarchar(max)",
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "IsConfirmed",
                table: "yv_Rooms",
                type: "bit",
                nullable: false,
                defaultValue: false);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "ConfirmedBy",
                table: "yv_Rooms");

            migrationBuilder.DropColumn(
                name: "IsConfirmed",
                table: "yv_Rooms");
        }
    }
}
