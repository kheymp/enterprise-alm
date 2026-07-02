namespace Enterprise.ALM.Domain.Entities;

public class DashboardSummary
{
    // High-Level KPIs
    public int TotalAssets { get; set; }

    public decimal? TotalAssetValue { get; set; }
    public int TotalLicenses { get; set; }
    public decimal? TotalLicenseCost { get; set; }

    // Metrics Chart
    public int AssignedAssets { get; set; }
    public int UnassignedAssets { get; set; }
    public int TotalSeatsOwned { get; set; }
    public int TotalSeatsUsed { get; set; }

    // Proactive Alerts
    public int ExpiringLicensesCount { get; set; }
    public List<ExpiringLicense> ExpiringLicenses { get; set; } = new();

}

public class ExpiringLicense
{
    public string Name { get; set; } = string.Empty;
    public DateTime RenewalDate { get; set; }
    public int DaysRemaining { get; set; }
}