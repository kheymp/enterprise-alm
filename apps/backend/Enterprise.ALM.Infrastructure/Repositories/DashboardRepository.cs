using Enterprise.ALM.Application.Interfaces;
using Enterprise.ALM.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace Enterprise.ALM.Infrastructure.Repositories;

public class DashboardRepository : IDashboardRepository
{
    private readonly ApplicationDbContext _context;

    public DashboardRepository(ApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<int> GetActiveAssetCountAsync()
    {
        return await _context.Assets.CountAsync(a => a.IsActive);
    }

    public async Task<decimal> GetTotalAssetValueAsync()
    {
        return await _context.Assets
            .Where(a => a.IsActive)
            .SumAsync(a => (decimal?)a.PurchasePrice ?? 0);
    }

    public async Task<int> GetAssignedAssetCountAsync()
    {
        return await _context.Assets
            .CountAsync(a => a.IsActive && a.AssignedUserId != null);
    }

    public async Task<int> GetActiveLicenseCountAsync()
    {
        return await _context.SoftwareLicenses.CountAsync(sl => sl.IsActive);
    }

    public async Task<decimal?> GetTotalLicenseCostAsync()
    {
        return await _context.SoftwareLicenses
            .Where(sl => sl.IsActive)
            .SumAsync(sl => (decimal?)(sl.CostPerSeat * sl.TotalSeats));
    }

    public async Task<int> GetTotalSeatsOwnedAsync()
    {
        return await _context.SoftwareLicenses
            .Where(sl => sl.IsActive)
            .SumAsync(sl => (int?)sl.TotalSeats) ?? 0;
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
            .Where(sl => sl.IsActive && sl.RenewalDate <= cutoffDate)
            .ToListAsync();
    }
}