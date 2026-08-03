using Enterprise.ALM.Application.Interfaces;
using Enterprise.ALM.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Enterprise.ALM.Application.DTOs.Dashboard;

namespace Enterprise.ALM.Infrastructure.Repositories;

public class DashboardRepository : IDashboardRepository
{
    private readonly ApplicationDbContext _context;

    public DashboardRepository(ApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<AssetStatsDto> GetAssetStatsAsync()
{
    return await _context.Assets
        .Where(a => a.IsActive)
        .GroupBy(a => 1)
        .Select(g => new AssetStatsDto
        {
            TotalAssets = g.Count(),
            TotalAssetValue = g.Sum(a => a.PurchasePrice),
            AssignedAssets = g.Count(a => a.AssignedUserId != null)
        })
        .FirstOrDefaultAsync() ?? new AssetStatsDto();
}

public async Task<LicenseStatsDto> GetLicenseStatsAsync()
{
    return await _context.SoftwareLicenses
        .Where(sl => sl.IsActive)
        .GroupBy(sl => 1)
        .Select(g => new LicenseStatsDto
        {
            TotalLicenses = g.Count(),
            TotalLicenseCost = g.Sum(sl => (decimal?)(sl.CostPerSeat * sl.TotalSeats)),
            TotalSeatsOwned = g.Sum(sl => sl.TotalSeats)
        })
        .FirstOrDefaultAsync() ?? new LicenseStatsDto();
}

public async Task<int> GetTotalSeatsUsedAsync()
{
    return await _context.LicenseAllocations
        .Where(la => la.SoftwareLicense!.IsActive)
        .CountAsync();
}

public async Task<List<SoftwareLicense>> GetExpiringLicensesAsync(DateTime cutoffDate)
{
    return await _context.SoftwareLicenses
        .AsNoTracking()
        .Where(sl => sl.IsActive && sl.RenewalDate <= cutoffDate)
        .ToListAsync();
}

}