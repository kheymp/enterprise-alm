using Enterprise.ALM.Application.DTOs.License;
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

    // Projects straight to the list DTO so the allocation rows never leave Postgres.
    // AllocatedSeats becomes a correlated COUNT subquery rather than a LEFT JOIN
    // returning one row per allocation.
    public async Task<List<LicenseListItemDto>> GetAllForListAsync(bool showInactive)
    {
        return await _context.SoftwareLicenses
            .AsNoTracking()
            .Where(sl => sl.IsActive || showInactive)
            .Select(sl => new LicenseListItemDto
            {
                Id = sl.Id,
                Name = sl.Name,
                Publisher = sl.Publisher,
                TotalSeats = sl.TotalSeats,
                CostPerSeat = sl.CostPerSeat,
                RenewalDate = sl.RenewalDate,
                IsActive = sl.IsActive,
                AllocatedSeats = sl.Allocations.Count
            })
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

    public async Task<SoftwareLicense?> GetByIdWithAllocationsAsync(int id)
    {
        return await _context.SoftwareLicenses
            .AsNoTracking()
            .Include(sl => sl.Allocations)
            .FirstOrDefaultAsync(sl => sl.Id == id);
    }
}