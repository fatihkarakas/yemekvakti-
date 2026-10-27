using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace YemekVakti.Api.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddPreferenceWeight : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "Weight",
                table: "yv_Preferences",
                type: "int",
                nullable: false,
                defaultValue: 0);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "Weight",
                table: "yv_Preferences");
        }
    }
}
