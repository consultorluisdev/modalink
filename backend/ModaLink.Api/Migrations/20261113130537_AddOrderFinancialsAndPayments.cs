using System;
using Microsoft.EntityFrameworkCore.Migrations;
using Npgsql.EntityFrameworkCore.PostgreSQL.Metadata;

#nullable disable

namespace ModaLink.Api.Migrations
{
    public partial class AddOrderFinancialsAndPayments : Migration
    {
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<decimal>(
                name: "FinancedAmount",
                table: "Orders",
                type: "numeric(18,2)",
                precision: 18,
                scale: 2,
                nullable: true);

            migrationBuilder.AddColumn<decimal>(
                name: "InterestAmount",
                table: "Orders",
                type: "numeric(18,2)",
                precision: 18,
                scale: 2,
                nullable: true);

            migrationBuilder.AddColumn<decimal>(
                name: "TotalWithInterest",
                table: "Orders",
                type: "numeric(18,2)",
                precision: 18,
                scale: 2,
                nullable: true);

            migrationBuilder.CreateTable(
                name: "Payments",
                columns: table => new
                {
                    Id = table.Column<int>(type: "integer", nullable: false)
                        .Annotation("Npgsql:ValueGenerationStrategy", NpgsqlValueGenerationStrategy.IdentityByDefaultColumn),
                    OrderId = table.Column<int>(type: "integer", nullable: false),
                    InstallmentId = table.Column<int>(type: "integer", nullable: true),
                    Amount = table.Column<decimal>(type: "numeric(18,2)", precision: 18, scale: 2, nullable: false),
                    Method = table.Column<string>(type: "text", nullable: true),
                    PaidAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UserId = table.Column<int>(type: "integer", nullable: true),
                    IdempotencyKey = table.Column<string>(type: "text", nullable: true),
                    ReversedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_Payments", x => x.Id);
                    table.ForeignKey(
                        name: "FK_Payments_Installments_InstallmentId",
                        column: x => x.InstallmentId,
                        principalTable: "Installments",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "FK_Payments_Orders_OrderId",
                        column: x => x.OrderId,
                        principalTable: "Orders",
                        principalColumn: "Id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_Payments_IdempotencyKey",
                table: "Payments",
                column: "IdempotencyKey",
                unique: true,
                filter: "\"IdempotencyKey\" IS NOT NULL");

            migrationBuilder.CreateIndex(
                name: "IX_Payments_InstallmentId",
                table: "Payments",
                column: "InstallmentId");

            migrationBuilder.CreateIndex(
                name: "IX_Payments_OrderId",
                table: "Payments",
                column: "OrderId");

            migrationBuilder.CreateIndex(
                name: "IX_Payments_PaidAt",
                table: "Payments",
                column: "PaidAt");

            migrationBuilder.Sql(
                @"INSERT INTO ""Payments"" (""OrderId"", ""InstallmentId"", ""Amount"", ""Method"", ""PaidAt"", ""UserId"", ""IdempotencyKey"", ""ReversedAt"")
SELECT i.""OrderId"", i.""Id"", COALESCE(i.""PaidAmount"", i.""Amount""), 'Legado', COALESCE(i.""PaidAt"", i.""DueDate""), NULL, NULL, NULL
FROM ""Installments"" i
WHERE i.""IsPaid"" = TRUE;");

            migrationBuilder.Sql(
                @"INSERT INTO ""Payments"" (""OrderId"", ""InstallmentId"", ""Amount"", ""Method"", ""PaidAt"", ""UserId"", ""IdempotencyKey"", ""ReversedAt"")
SELECT o.""Id"", NULL, o.""DownPayment"", 'Entrada (legado)', o.""CreatedAt"", NULL, NULL, NULL
FROM ""Orders"" o
WHERE o.""DownPayment"" IS NOT NULL AND o.""DownPayment"" > 0;");

            migrationBuilder.Sql(
                @"UPDATE ""Orders"" o
SET ""FinancedAmount"" = ROUND(o.""Total"" - COALESCE(o.""DownPayment"", 0), 2),
    ""TotalWithInterest"" = i.""TotalInstallments"",
    ""InterestAmount"" = ROUND(i.""TotalInstallments"" - (o.""Total"" - COALESCE(o.""DownPayment"", 0)), 2)
FROM (
    SELECT ""OrderId"", SUM(""Amount"") AS ""TotalInstallments""
    FROM ""Installments""
    GROUP BY ""OrderId""
) i
WHERE o.""Id"" = i.""OrderId"";");

            migrationBuilder.Sql(
                @"UPDATE ""Orders"" o
SET ""FinancedAmount"" = 0,
    ""InterestAmount"" = 0,
    ""TotalWithInterest"" = o.""Total""
WHERE NOT EXISTS (SELECT 1 FROM ""Installments"" i WHERE i.""OrderId"" = o.""Id"");");

            migrationBuilder.Sql(
                @"UPDATE ""Orders"" SET ""Status"" = 'Paid' WHERE ""Status"" = 'Completed';");
        }

        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "Payments");

            migrationBuilder.DropColumn(
                name: "FinancedAmount",
                table: "Orders");

            migrationBuilder.DropColumn(
                name: "InterestAmount",
                table: "Orders");

            migrationBuilder.DropColumn(
                name: "TotalWithInterest",
                table: "Orders");
        }
    }
}
