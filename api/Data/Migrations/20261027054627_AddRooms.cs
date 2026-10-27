using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace YemekVakti.Api.Data.Migrations
{
    /// <inheritdoc />
    public partial class AddRooms : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "yv_Rooms",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    Code = table.Column<string>(type: "nvarchar(16)", maxLength: 16, nullable: false),
                    Title = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    CreatorUserId = table.Column<int>(type: "int", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    ExpiresAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    IsClosed = table.Column<bool>(type: "bit", nullable: false),
                    WinningRestaurantId = table.Column<int>(type: "int", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_yv_Rooms", x => x.Id);
                    table.ForeignKey(
                        name: "FK_yv_Rooms_yv_Restaurants_WinningRestaurantId",
                        column: x => x.WinningRestaurantId,
                        principalTable: "yv_Restaurants",
                        principalColumn: "Id");
                });

            migrationBuilder.CreateTable(
                name: "yv_RoomOptions",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    RoomId = table.Column<int>(type: "int", nullable: false),
                    RestaurantId = table.Column<int>(type: "int", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_yv_RoomOptions", x => x.Id);
                    table.ForeignKey(
                        name: "FK_yv_RoomOptions_yv_Restaurants_RestaurantId",
                        column: x => x.RestaurantId,
                        principalTable: "yv_Restaurants",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_yv_RoomOptions_yv_Rooms_RoomId",
                        column: x => x.RoomId,
                        principalTable: "yv_Rooms",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "yv_RoomVotes",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    RoomId = table.Column<int>(type: "int", nullable: false),
                    RoomOptionId = table.Column<int>(type: "int", nullable: false),
                    UserId = table.Column<int>(type: "int", nullable: false),
                    UserName = table.Column<string>(type: "nvarchar(100)", maxLength: 100, nullable: false),
                    VotedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_yv_RoomVotes", x => x.Id);
                    table.ForeignKey(
                        name: "FK_yv_RoomVotes_yv_RoomOptions_RoomOptionId",
                        column: x => x.RoomOptionId,
                        principalTable: "yv_RoomOptions",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_yv_RoomVotes_yv_Rooms_RoomId",
                        column: x => x.RoomId,
                        principalTable: "yv_Rooms",
                        principalColumn: "Id");
                });

            migrationBuilder.CreateIndex(
                name: "IX_yv_RoomOptions_RestaurantId",
                table: "yv_RoomOptions",
                column: "RestaurantId");

            migrationBuilder.CreateIndex(
                name: "IX_yv_RoomOptions_RoomId",
                table: "yv_RoomOptions",
                column: "RoomId");

            migrationBuilder.CreateIndex(
                name: "IX_yv_Rooms_Code",
                table: "yv_Rooms",
                column: "Code",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_yv_Rooms_WinningRestaurantId",
                table: "yv_Rooms",
                column: "WinningRestaurantId");

            migrationBuilder.CreateIndex(
                name: "IX_yv_RoomVotes_RoomId_UserId",
                table: "yv_RoomVotes",
                columns: new[] { "RoomId", "UserId" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_yv_RoomVotes_RoomOptionId",
                table: "yv_RoomVotes",
                column: "RoomOptionId");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "yv_RoomVotes");

            migrationBuilder.DropTable(
                name: "yv_RoomOptions");

            migrationBuilder.DropTable(
                name: "yv_Rooms");
        }
    }
}
