namespace Enterprise.ALM.Application.DTOs.Dashboard;

/// <summary>
/// Asset aggregates, computed in a single SQL statement rather than one query per figure.
/// </summary>
public class AssetStatsDto
{
    public int TotalAssets { get; set; }
    public decimal TotalAssetValue { get; set; }
    public int AssignedAssets { get; set; }
}

/// <summary>
/// License aggregates, likewise computed in a single SQL statement.
/// </summary>
public class LicenseStatsDto
{
    public int TotalLicenses { get; set; }
    public decimal? TotalLicenseCost { get; set; }
    public int TotalSeatsOwned { get; set; }
}
