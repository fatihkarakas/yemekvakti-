using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace YemekVakti.Api.Data.Migrations
{
    /// <inheritdoc />
    public partial class InitialCreate : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "yv_Restaurants",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    GooglePlaceId = table.Column<string>(type: "nvarchar(128)", maxLength: 128, nullable: true),
                    Name = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    Address = table.Column<string>(type: "nvarchar(400)", maxLength: 400, nullable: true),
                    Lat = table.Column<double>(type: "float", nullable: false),
                    Lng = table.Column<double>(type: "float", nullable: false),
                    Cuisines = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: false),
                    PriceLevel = table.Column<int>(type: "int", nullable: true),
                    GoogleRating = table.Column<double>(type: "float", nullable: true),
                    GoogleRatingCount = table.Column<int>(type: "int", nullable: true),
                    MapsUrl = table.Column<string>(type: "nvarchar(512)", maxLength: 512, nullable: true),
                    CreatedByUserId = table.Column<int>(type: "int", nullable: true),
                    UpdatedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_yv_Restaurants", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "yv_SuggestionLogs",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    UserId = table.Column<int>(type: "int", nullable: false),
                    RestaurantId = table.Column<int>(type: "int", nullable: false),
                    Source = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: false),
                    SelectedCuisines = table.Column<string>(type: "nvarchar(200)", maxLength: 200, nullable: true),
                    Reason = table.Column<string>(type: "nvarchar(500)", maxLength: 500, nullable: true),
                    Accepted = table.Column<bool>(type: "bit", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_yv_SuggestionLogs", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "yv_Users",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    ExternalId = table.Column<string>(type: "nvarchar(128)", maxLength: 128, nullable: false),
                    Email = table.Column<string>(type: "nvarchar(256)", maxLength: 256, nullable: false),
                    Name = table.Column<string>(type: "nvarchar(128)", maxLength: 128, nullable: false),
                    PhotoUrl = table.Column<string>(type: "nvarchar(512)", maxLength: 512, nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    LastLoginAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_yv_Users", x => x.Id);
                });

            migrationBuilder.CreateTable(
                name: "yv_Preferences",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    UserId = table.Column<int>(type: "int", nullable: false),
                    RestaurantId = table.Column<int>(type: "int", nullable: false),
                    Type = table.Column<int>(type: "int", nullable: false),
                    CreatedAt = table.Column<DateTime>(type: "datetime2", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_yv_Preferences", x => x.Id);
                    table.ForeignKey(
                        name: "FK_yv_Preferences_yv_Restaurants_RestaurantId",
                        column: x => x.RestaurantId,
                        principalTable: "yv_Restaurants",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "yv_Visits",
                columns: table => new
                {
                    Id = table.Column<int>(type: "int", nullable: false)
                        .Annotation("SqlServer:Identity", "1, 1"),
                    UserId = table.Column<int>(type: "int", nullable: false),
                    RestaurantId = table.Column<int>(type: "int", nullable: false),
                    VisitedAt = table.Column<DateTime>(type: "datetime2", nullable: false),
                    Source = table.Column<string>(type: "nvarchar(20)", maxLength: 20, nullable: false),
                    Stars = table.Column<int>(type: "int", nullable: true),
                    Note = table.Column<string>(type: "nvarchar(1000)", maxLength: 1000, nullable: true),
                    RatedAt = table.Column<DateTime>(type: "datetime2", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_yv_Visits", x => x.Id);
                    table.ForeignKey(
                        name: "FK_yv_Visits_yv_Restaurants_RestaurantId",
                        column: x => x.RestaurantId,
                        principalTable: "yv_Restaurants",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_yv_Visits_yv_Users_UserId",
                        column: x => x.UserId,
                        principalTable: "yv_Users",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_yv_Preferences_RestaurantId",
                table: "yv_Preferences",
                column: "RestaurantId");

            migrationBuilder.CreateIndex(
                name: "IX_yv_Preferences_UserId_RestaurantId",
                table: "yv_Preferences",
                columns: new[] { "UserId", "RestaurantId" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_yv_Restaurants_GooglePlaceId",
                table: "yv_Restaurants",
                column: "GooglePlaceId",
                unique: true,
                filter: "[GooglePlaceId] IS NOT NULL");

            migrationBuilder.CreateIndex(
                name: "IX_yv_Users_ExternalId",
                table: "yv_Users",
                column: "ExternalId",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_yv_Visits_RestaurantId",
                table: "yv_Visits",
                column: "RestaurantId");

            migrationBuilder.CreateIndex(
                name: "IX_yv_Visits_UserId_VisitedAt",
                table: "yv_Visits",
                columns: new[] { "UserId", "VisitedAt" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "yv_Preferences");

            migrationBuilder.DropTable(
                name: "yv_SuggestionLogs");

            migrationBuilder.DropTable(
                name: "yv_Visits");

            migrationBuilder.DropTable(
                name: "yv_Restaurants");

            migrationBuilder.DropTable(
                name: "yv_Users");
        }
    }
}
