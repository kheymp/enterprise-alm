using Enterprise.ALM.Application.Interfaces;
using Enterprise.ALM.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace Enterprise.ALM.Infrastructure.Repositories;

public class LicenseRepository : ILicenseRepository
{
    private readonly ApplicationDbContext _context;

    public LicenseRepository(ApplicationDbContext context) {
        _context = context;
    }

    public async Task<List<SoftwareLicense>> GetAllWithAllocationsAsync(bool showInactive)
    {
        return await _context.SoftwareLicenses
            .Where(sl => sl.IsActive || showInactive)
            .Include(sl => sl.Allocations)
            .ToListAsync();
    }

    public async Task<SoftwareLicense?> GetByIdAsync(int id)
    {
        return await _context.SoftwareLicenses.FindAsync(id);
    }

    public async Task AddAsync(SoftwareLicense license)
    {
        await _context.SoftwareLicenses.AddAsync(license);
    }

    public async Task SaveChangesAsync()
    {
        await _context.SaveChangesAsync();
    }

    public async Task<int> GetAllocationCountAsync(int licenseId)
    {
        return await _context.LicenseAllocations
            .CountAsync(la => la.SoftwareLicenseId == licenseId);
    }

    public async Task<bool> IsAlreadyAllocatedAsync(int licenseId, int userId)
    {
        return await _context.LicenseAllocations
            .AnyAsync(la => la.SoftwareLicenseId == licenseId && la.UserId == userId);
    }

    public async Task AddAllocationAsync(LicenseAllocation allocation)
    {
        await _context.LicenseAllocations.AddAsync(allocation);
    }

    public async Task<LicenseAllocation?> GetAllocationAsync(int licenseId, int userId)
    {
        return await _context.LicenseAllocations
            .FirstOrDefaultAsync(la => la.SoftwareLicenseId == licenseId && la.UserId == userId);
    }

    public void RemoveAllocation(LicenseAllocation allocation)
    {
        _context.LicenseAllocations.Remove(allocation);
    }
}