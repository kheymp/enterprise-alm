using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Enterprise.ALM.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class ConfigureAssetOnDeleteSetNull : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Assets_Users_AssignedUserId",
                table: "Assets");

            migrationBuilder.AddForeignKey(
                name: "FK_Assets_Users_AssignedUserId",
                table: "Assets",
                column: "AssignedUserId",
                principalTable: "Users",
                principalColumn: "Id",
                onDelete: ReferentialAction.SetNull);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropForeignKey(
                name: "FK_Assets_Users_AssignedUserId",
                table: "Assets");

            migrationBuilder.AddForeignKey(
                name: "FK_Assets_Users_AssignedUserId",
                table: "Assets",
                column: "AssignedUserId",
                principalTable: "Users",
                principalColumn: "Id");
        }
    }
}
