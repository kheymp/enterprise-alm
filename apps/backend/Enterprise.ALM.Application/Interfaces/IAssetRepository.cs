using Enterprise.ALM.Domain.Entities;

namespace Enterprise.ALM.Application.Interfaces;

public interface IAssetRepository
{
    Task<List<Asset>> GetAllWithAssignedUserAsync();
    Task<Asset?> GetByIdWithDetailsAsync(int id);
    Task<Asset?> GetByIdAsync(int id);
    Task AddAsync(Asset asset);
    Task SaveChangesAsync();
    void Remove(Asset asset);
    Task AddMaintenanceRecordAsync(MaintenanceRecord record);
}
