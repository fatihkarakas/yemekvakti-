using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace YemekVakti.Api.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddAvgPriceTl : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<int>(
                name: "AvgPriceTl",
                table: "yv_Restaurants",
                type: "int",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "AvgPriceTl",
                table: "yv_Restaurants");
        }
    }
}
