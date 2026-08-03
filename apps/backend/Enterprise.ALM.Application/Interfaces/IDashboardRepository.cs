using Enterprise.ALM.Application.DTOs.Dashboard;
using Enterprise.ALM.Domain.Entities;

namespace Enterprise.ALM.Application.Interfaces;

public interface IDashboardRepository
{
    Task<AssetStatsDto> GetAssetStatsAsync();
    Task<LicenseStatsDto> GetLicenseStatsAsync();
    Task<int> GetTotalSeatsUsedAsync();
    Task<List<SoftwareLicense>> GetExpiringLicensesAsync(DateTime cutoffDate);
}
