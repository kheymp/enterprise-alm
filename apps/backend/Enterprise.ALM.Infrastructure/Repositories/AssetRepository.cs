using Enterprise.ALM.Application.Interfaces;
using Enterprise.ALM.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace Enterprise.ALM.Infrastructure.Repositories;

public class AssetRepository : IAssetRepository
{
    private readonly ApplicationDbContext _context;

    public AssetRepository(ApplicationDbContext context)
    {
        _context = context;
    }

    public async Task<List<Asset>> GetAllWithAssignedUserAsync()
    {
        return await _context.Assets
            .Include(a => a.AssignedUser)
            .ToListAsync();
    }

    public async Task<Asset?> GetByIdWithDetailsAsync(int id)
    {
        return await _context.Assets
            .Include(a => a.AssignedUser)
            .Include(a => a.MaintenanceRecords)
            .FirstOrDefaultAsync(a => a.Id == id);
    }

    public async Task<Asset?> GetByIdAsync(int id)
    {
        return await _context.Assets.FindAsync(id);
    }

    public async Task AddAsync(Asset asset)
    {
        await _context.Assets.AddAsync(asset);
    }

    public async Task SaveChangesAsync()
    {
        await _context.SaveChangesAsync();
    }

    public void Remove(Asset asset) 
    {
        _context.Assets.Remove(asset);
    }

    public async Task AddMaintenanceRecordAsync(MaintenanceRecord record)
    {
        await _context.MaintenanceRecords.AddAsync(record);
    }
}