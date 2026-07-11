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
        var totalAssets = await _dashboardRepository.GetActiveAssetCountAsync();
        var totalAssetValue = await _dashboardRepository.GetTotalAssetValueAsync();
        var assignedAssets = await _dashboardRepository.GetAssignedAssetCountAsync();
        var unassignedAssets = totalAssets - assignedAssets;
        var totalLicenses = await _dashboardRepository.GetActiveLicenseCountAsync();
        var totalLicenseCost = await _dashboardRepository.GetTotalLicenseCostAsync();
        var totalSeatsOwned = await _dashboardRepository.GetTotalSeatsOwnedAsync();
        var totalSeatsUsed = await _dashboardRepository.GetTotalSeatsUsedAsync();
        var thirtyDaysFromNow = DateTime.UtcNow.AddDays(30);
        var expiringLicenses = await _dashboardRepository.GetExpiringLicensesAsync(thirtyDaysFromNow);
        var expiringLicenseDtos = expiringLicenses.Select(sl => new ExpiringLicenseDto
        {
            Name = sl.Name,
            RenewalDate = sl.RenewalDate,
            DaysRemaining = (sl.RenewalDate - DateTime.UtcNow).Days
        }).ToList();
        // BUSINESS LOGIC: Viewers cannot see dollar values
        return new DashboardSummaryDto
        {
            TotalAssets = totalAssets,
            TotalAssetValue = isViewer ? null : totalAssetValue,
            TotalLicenses = totalLicenses,
            TotalLicenseCost = isViewer ? null : totalLicenseCost,
            AssignedAssets = assignedAssets,
            UnassignedAssets = unassignedAssets,
            TotalSeatsOwned = totalSeatsOwned,
            TotalSeatsUsed = totalSeatsUsed,
            ExpiringLicensesCount = expiringLicenseDtos.Count,
            ExpiringLicenses = expiringLicenseDtos
        };
    }
}