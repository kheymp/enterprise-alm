using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace Enterprise.ALM.Infrastructure.Migrations
{
    /// <inheritdoc />
    public partial class RemoveEmployeeRole : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            // Safely migrate any existing Employee users to Viewer BEFORE deleting the role
            migrationBuilder.Sql("UPDATE Users SET RoleId = 3 WHERE RoleId = 4;");

            migrationBuilder.DeleteData(
                table: "Roles",
                keyColumn: "Id",
                keyValue: 4);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.InsertData(
                table: "Roles",
                columns: new[] { "Id", "Description", "Name" },
                values: new object[] { 4, "No system access. Used for asset asignment only.", "Employee" });
        }
    }
}
