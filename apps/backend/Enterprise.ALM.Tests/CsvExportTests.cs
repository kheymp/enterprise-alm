using System.Globalization;
using System.Text;
using Enterprise.ALM.Application.Interfaces;
using Enterprise.ALM.Application.Services;
using Enterprise.ALM.Domain.Entities;
using Moq;
using Xunit;

namespace Enterprise.ALM.Tests;

public class CsvExportTests
{
    private readonly Mock<IAssetRepository> _assetRepo = new();

    // U+FEFF written as a cast rather than an escape so the byte-order mark
    // never appears as an invisible character in this source file.
    private const char Bom = (char)0xFEFF;

    private const string ExpectedHeader =
        "Id,Name,Serial Number,Purchase Date,Purchase Price," +
        "Salvage Value,Expected Lifespan (Months),Status,Assigned To";

    private async Task<string> ExportAsync()
    {
        var bytes = await new AssetService(_assetRepo.Object).ExportAssetsToCsvAsync();

        // Encoding.UTF8.GetString does NOT strip a preamble (unlike StreamReader
        // or the browser's res.text()), so the BOM survives as a real character.
        return Encoding.UTF8.GetString(bytes);
    }

    /* ── RFC 4180 escaping rules ── */

    [Fact]
    public void Escape_PlainValue_IsNotQuoted()
        => Assert.Equal("Laptop", CsvWriter.Escape("Laptop"));

    [Fact]
    public void Escape_ValueWithComma_IsWrappedInQuotes()
        => Assert.Equal("\"Dell, Inc.\"", CsvWriter.Escape("Dell, Inc."));

    [Fact]
    public void Escape_ValueWithQuotes_DoublesInnerQuotesAndWraps()
        => Assert.Equal("\"Monitor 27\"\"\"", CsvWriter.Escape("Monitor 27\""));

    [Fact]
    public void Escape_ValueWithNewline_IsWrappedInQuotes()
        => Assert.Equal("\"line1\nline2\"", CsvWriter.Escape("line1\nline2"));

    [Fact]
    public void Escape_ValueWithCarriageReturn_IsWrappedInQuotes()
        => Assert.Equal("\"line1\r\nline2\"", CsvWriter.Escape("line1\r\nline2"));

    [Theory]
    [InlineData(null)]
    [InlineData("")]
    public void Escape_NullOrEmpty_ReturnsEmptyString(string? input)
        => Assert.Equal(string.Empty, CsvWriter.Escape(input));

    /* ── Whole-file shape ── */

    [Fact]
    public async Task ExportAssetsToCsvAsync_EmptyList_StartsWithBomThenHeaderRow()
    {
        _assetRepo.Setup(r => r.GetAllWithAssignedUserAsync())
                  .ReturnsAsync(new List<Asset>());

        var csv = await ExportAsync();

        Assert.Equal(Bom, csv[0]);
        Assert.Equal(ExpectedHeader, csv.Split("\r\n")[0].TrimStart(Bom));
    }

    [Fact]
    public async Task ExportAssetsToCsvAsync_EscapesFieldsAndPadsDecimals()
    {
        _assetRepo.Setup(r => r.GetAllWithAssignedUserAsync()).ReturnsAsync(new List<Asset>
        {
            new()
            {
                Id = 1,
                Name = "Monitor, 27\"",              // contains a comma AND a quote
                SerialNumber = "SN-001",
                PurchaseDate = new DateTime(2024, 3, 9),
                PurchasePrice = 1234.5m,             // must render as 1234.50
                SalvageValue = 100m,
                ExpectedLifespanMonths = 36,
                IsActive = true,
                AssignedUser = new User { Username = "kheymp" }
            }
        });

        var csv = await ExportAsync();

        Assert.Equal(
            "1,\"Monitor, 27\"\"\",SN-001,2024-03-09,1234.50,100.00,36,Active,kheymp",
            csv.Split("\r\n")[1]);
    }

    [Fact]
    public async Task ExportAssetsToCsvAsync_NameWithNewline_KeepsRowIntact()
    {
        _assetRepo.Setup(r => r.GetAllWithAssignedUserAsync()).ReturnsAsync(new List<Asset>
        {
            new()
            {
                Id = 4,
                Name = "Rack\nUnit 3",                // embedded LF
                SerialNumber = "SN-004",
                PurchaseDate = new DateTime(2024, 6, 1),
                PurchasePrice = 500m,
                SalvageValue = 50m,
                ExpectedLifespanMonths = 12,
                IsActive = true
            }
        });

        var csv = await ExportAsync();

        // The quoted newline means splitting on CRLF still yields one data row.
        var rows = csv.Split("\r\n");
        Assert.Equal("4,\"Rack\nUnit 3\",SN-004,2024-06-01,500.00,50.00,12,Active,", rows[1]);
    }

    [Fact]
    public async Task ExportAssetsToCsvAsync_UnassignedAsset_LeavesFieldEmpty()
    {
        _assetRepo.Setup(r => r.GetAllWithAssignedUserAsync()).ReturnsAsync(new List<Asset>
        {
            new()
            {
                Id = 2,
                Name = "Keyboard",
                SerialNumber = "SN-002",
                PurchaseDate = new DateTime(2024, 1, 1),
                PurchasePrice = 50m,
                SalvageValue = 0m,
                ExpectedLifespanMonths = 24,
                IsActive = false,
                AssignedUser = null                  // nobody assigned
            }
        });

        var csv = await ExportAsync();

        // Trailing empty field: the row ends with a comma and nothing after it.
        Assert.EndsWith(",Inactive,", csv.Split("\r\n")[1]);
    }

    [Fact]
    public async Task ExportAssetsToCsvAsync_UnderCommaDecimalCulture_StillUsesInvariantFormatting()
    {
        // de-DE uses ',' as its decimal separator. Without InvariantCulture this
        // row would gain an extra column and corrupt every field after the price.
        var original = CultureInfo.CurrentCulture;
        CultureInfo.CurrentCulture = new CultureInfo("de-DE");
        try
        {
            _assetRepo.Setup(r => r.GetAllWithAssignedUserAsync()).ReturnsAsync(new List<Asset>
            {
                new()
                {
                    Id = 3,
                    Name = "Server",
                    SerialNumber = "SN-003",
                    PurchaseDate = new DateTime(2024, 12, 31),
                    PurchasePrice = 1234.56m,
                    SalvageValue = 78.9m,
                    ExpectedLifespanMonths = 60,
                    IsActive = true
                }
            });

            var csv = await ExportAsync();

            Assert.Equal("3,Server,SN-003,2024-12-31,1234.56,78.90,60,Active,",
                         csv.Split("\r\n")[1]);
        }
        finally
        {
            CultureInfo.CurrentCulture = original;
        }
    }
}
