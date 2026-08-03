using Enterprise.ALM.Application.DTOs.Dashboard;
using Enterprise.ALM.Application.Interfaces;

namespace Enterprise.ALM.Application.Services;

public class DashboardService : IDashboardService
{
    private readonly IDashboardRepository _dashboardRepository;

    public DashboardService(IDashboardRepository dashboardRepository)
    {
        _dashboardRepository = dashboardRepository;
    }
    
    public async Task<DashboardSummaryDto> GetSummaryAsync(bool isViewer)
{
    var assetStats = await _dashboardRepository.GetAssetStatsAsync();
    var licenseStats = await _dashboardRepository.GetLicenseStatsAsync();
    var totalSeatsUsed = await _dashboardRepository.GetTotalSeatsUsedAsync();

    var thirtyDaysFromNow = DateTime.UtcNow.AddDays(30);
    var expiringLicenses = await _dashboardRepository.GetExpiringLicensesAsync(thirtyDaysFromNow);

    var expiringLicenseDtos = expiringLicenses.Select(sl => new ExpiringLicenseDto
    {
        Name = sl.Name,
        Publisher = sl.Publisher,
        RenewalDate = sl.RenewalDate,
        DaysRemaining = (sl.RenewalDate - DateTime.UtcNow).Days
    }).ToList();

    // BUSINESS LOGIC: Viewers cannot see dollar values
    return new DashboardSummaryDto
    {
        TotalAssets = assetStats.TotalAssets,
        TotalAssetValue = isViewer ? null : assetStats.TotalAssetValue,
        TotalLicenses = licenseStats.TotalLicenses,
        TotalLicenseCost = isViewer ? null : licenseStats.TotalLicenseCost,
        AssignedAssets = assetStats.AssignedAssets,
        UnassignedAssets = assetStats.TotalAssets - assetStats.AssignedAssets,
        TotalSeatsOwned = licenseStats.TotalSeatsOwned,
        TotalSeatsUsed = totalSeatsUsed,
        ExpiringLicensesCount = expiringLicenseDtos.Count,
        ExpiringLicenses = expiringLicenseDtos
    };
}

}