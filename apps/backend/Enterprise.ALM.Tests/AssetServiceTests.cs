using Enterprise.ALM.Application.Interfaces;
using Enterprise.ALM.Application.Services;
using Enterprise.ALM.Domain.Entities;
using Moq;
using Xunit;

namespace Enterprise.ALM.Tests;

public class AssetServiceTests
{
    private readonly Mock<IAssetRepository> _assetRepo = new();

    [Fact]
    public async Task GetAssetDetailsAsync_KnownInputs_ReturnsKnownBookValue()
    {
        // Arrange: purchase exactly 10 whole months before the 1st of this month.
        // monthsOwned is therefore always 10, regardless of today's date.
        var anchor = new DateTime(DateTime.Now.Year, DateTime.Now.Month, 1).AddMonths(-10);
        var asset = new Asset
        {
            Id = 1,
            PurchasePrice = 12100m,
            SalvageValue = 100m,
            ExpectedLifespanMonths = 120,
            PurchaseDate = anchor
        };
        _assetRepo.Setup(r => r.GetByIdWithDetailsAsync(1)).ReturnsAsync(asset);

        var service = new AssetService(_assetRepo.Object);

        // Act
        var result = await service.GetAssetDetailsAsync(1);

        // Assert
        // monthlyDepreciation = (12100 - 100) / 120 = 100
        // currentValue = 12100 - (100 * 10) = 11100
        Assert.NotNull(result);
        Assert.Equal(11100m, result!.CalculatedCurrentValue);
    }

    [Fact]
    public async Task GetAssetDetailsAsync_PastLifespan_FloorsAtSalvageValue()
    {
        // Arrange: bought 10 years ago, but lifespan is only 12 months.
        var asset = new Asset
        {
            Id = 2,
            PurchasePrice = 1300m,
            SalvageValue = 100m,
            ExpectedLifespanMonths = 12,
            PurchaseDate = DateTime.Now.AddYears(-10)
        };
        _assetRepo.Setup(r => r.GetByIdWithDetailsAsync(2)).ReturnsAsync(asset);

        var service = new AssetService(_assetRepo.Object);

        // Act
        var result = await service.GetAssetDetailsAsync(2);

        // Assert: without Math.Min, value would go deeply negative.
        // With it, monthsPassed caps at 12, so value floors exactly at salvage (100).
        Assert.NotNull(result);
        Assert.Equal(100m, result!.CalculatedCurrentValue);
    }
}