using Enterprise.ALM.Domain.Entities;

namespace Enterprise.ALM.Application.Interfaces;

public interface IDashboardRepository
{
    Task<int> GetActiveAssetCountAsync();
    Task<decimal> GetTotalAssetValueAsync();
    Task<int> GetAssignedAssetCountAsync();
    Task<int> GetActiveLicenseCountAsync();
    Task<decimal?> GetTotalLicenseCostAsync();
    Task<int> GetTotalSeatsOwnedAsync();
    Task<int> GetTotalSeatsUsedAsync();
    Task<List<SoftwareLicense>> GetExpiringLicensesAsync(DateTime cutoffDate);
}
